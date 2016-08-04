#!/usr/bin/env python
import re
import os
import json

import tornado.auth
import tornado.web
import tornado.httpserver
import tornado.httputil
import tornado.httpclient
import tornado.gen
from tornado import iostream, ioloop
from tornado import websocket
import twitstream
import tweepy
import pymongo
from geopy.geocoders import GoogleV3

from config import settings

client = pymongo.MongoClient('localhost', 27017)
db = client.lonely_planet

CLIENTS = []
geo = GoogleV3()


def insert_tweet(status):
    """ Inserts tweet into tweets collection """
    status['replies'] = []
    return db.tweets.insert(status)


def add_tweet_reply(tweet_id, user, text):
    """ Adds a reply to the saved tweet """
    reply = {'user': user, 'text': text}
    return db.tweets.update(
        {'id_str': tweet_id}, {'$push': {'replies': reply}}, True)


def create_google_components(status):
    """ Creates a components dict for the google geocoder """
    components = None
    if status['place']:
        split = status['place']['full_name'].split(',')
        components = {
            'locality': split[0].strip(),
            'administrative_area': split[1].strip(),
            'country': status['place']['country']
        }

    elif status['user'].has_key('location') and status['user']['location']:
        split = status['user']['location'].split(',')
        components = {
            'locality': split[0].strip(),
            'administrative_area': split[1].strip() if len(split) > 1 else ''
        }
    return components


def tweet_is_valid(status):
    """
    Runs various tests on the tweet text
    to make sure its' a good one.
    """
    if not status.has_key('text'):
        return False

    text = status['text'].encode('utf-8')
    pattern = re.compile('.*(^RT|https?.*|@|[Ll]onely\s[Ii]sland)')
    if not re.match(pattern, text):
        return True
    else:
        return False


def geocode_status(status):
    """ Uses the Google V3 geocoder to geocode the tweet """
    components = create_google_components(status)
    if components:
        response = geo.geocode("", components=components)
        coded = response.raw if hasattr(response, 'raw') else None
    else:
        coded = None
    status['lp_geo'] = coded
    return status


def broadcast(data):
    """ Pushes data to all connected clients """
    for client in CLIENTS:
        client.write_message(data)


@tornado.gen.coroutine
def tweet_callback(status):
    """
    Callback fired on data from the Twitter streaming API.
    Filters out tweets with RTs or urls in them, geocodes them
    if they have location information, and pushes the geocoded
    tweets out to connected clients
    """
    if status[-3].endswith('}'):
        status = json.loads(status)
        # insert_tweet(status)
        if tweet_is_valid(status) and CLIENTS:
            status = geocode_status(status)
            broadcast(status)


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        if self.get_secure_cookie('oauth_token'):
            self.redirect('/planet')

        self.render('index.html')


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Credentials", "true")
        self.set_header("Access-Control-Allow-Methods", "GET")

        token = self.get_secure_cookie('oauth_token')
        self.render('planet.html', authenticated=token)


class ClientSocket(websocket.WebSocketHandler):
    def open(self):
        CLIENTS.append(self)

    def on_close(self):
        CLIENTS.remove(self)


class TwitterHandler(tornado.web.RequestHandler,
                        tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def get(self):
        if self.get_argument("oauth_token", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))
            return
        self.authorize_redirect()

    def _on_auth(self, user):
        if not user:
            raise tornado.web.HTTPError(500, "Twitter auth failed")
        self.set_secure_cookie('user_id', str(user['id']))
        self.set_secure_cookie('oauth_token', user['access_token']['key'])
        self.set_secure_cookie('oauth_secret', user['access_token']['secret'])
        self.redirect('/planet')


class LogoutHandler(tornado.web.RequestHandler):
    def get(self):
        self.clear_cookie('user_id')
        self.clear_cookie('oauth_token')
        self.clear_cookie('oauth_secret')
        self.redirect('/')


class PostHandler(tornado.web.RequestHandler,
                    tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def put(self, tweet_id):
        oAuthToken = self.get_secure_cookie('oauth_token')
        oAuthSecret = self.get_secure_cookie('oauth_secret')
        user_id = self.get_secure_cookie('user_id')
        tweet = json.loads(self.request.body)

        if oAuthToken and oAuthSecret:
            accessToken = {'key': oAuthToken, 'secret': oAuthSecret}
            data = {
                'status': tweet['responseText'],
                'in_reply_to_status_id': tweet['id']
            }
            self.twitter_request(
                "/statuses/update",
                post_args=data,
                access_token=accessToken,
                callback=self.async_callback(self._on_post)
            )
            add_tweet_reply(tweet_id, user_id, tweet['responseText'])

        res = json.dumps({"code": 200, "response": "success"})
        self.finish(res)

    def _on_post(self, new_entry):
        if not new_entry:
            self.authorize_redirect()
            return


if __name__ == "__main__":
    # Stream
    stream = twitstream.twitstream(
        'track', tweet_callback, defaultdata=['lonely'])

    # Tornado
    settings = dict(
        twitter_consumer_key=settings['CONSUMER_KEY'],
        twitter_consumer_secret=settings['CONSUMER_SECRET'],
        cookie_secret=settings['COOKIE_SECRET'],
        template_path=os.path.join( os.path.dirname( __file__ ), 'templates'),
        static_path=os.path.join(os.path.dirname(__file__), "static")
    )
    app = tornado.web.Application(
    	handlers = [
            (r"/", IndexHandler),
            (r"/planet", MainHandler),
            (r"/login", TwitterHandler),
            (r"/logout", LogoutHandler),
            (r"/post/([0-9]+)", PostHandler),
            (r"/socket", ClientSocket),
            (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": "./static"}),
        ],
        **settings
    )
    http_server = tornado.httpserver.HTTPServer(app)
    http_server.listen(9000)
    stream.run()
