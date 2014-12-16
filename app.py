#!/usr/bin/env python
from config import settings

import tornado.web
import tornado.httpserver
import tornado.httputil
import tornado.auth
import tornado.httpclient
import tornado.gen
from tornado import websocket

import twitstream
import requests
import re
import os
import json
import dstk
from pymongo import MongoClient

client = MongoClient('localhost', 27017)
db = client.lonely_planet

GLOBALS={
    'sockets': [],
    'users' : []
}

(options, args) = twitstream.parser.parse_args()
twitUser = None
authenticated = False
ds = dstk.DSTK()

if len(args) < 1:
    args = ['track', 'lonely']
    method = 'track'
else:
    method = args[0]
    if method not in twitstream.GETMETHODS and \
            method not in twitstream.POSTPARAMS:
        raise NotImplementedError("Unknown method: %s" % method)

def handle_request(response, status):
    """ Pushes the tweet to connected clients """
    if response.error:
        print "Error:", response.error
    else:
        res = json.loads(response.body)
        if res['status'] == "OK":
            status['lp_geo'] = res['results'][0]
            for socket in GLOBALS['sockets']:
                socket.write_message(status)

def insert_tweet(status):
    """ Inserts tweet into Mongo"""

    status['replies'] = []
    return db.tweets.insert(status)

def add_tweet_reply(tweet_id, user, text):
    """Adds a reply to the saved tweet"""

    reply = {'user': user, 'text': text}
    return db.tweets.update(
        {'id_str': tweet_id}, {'$push': {'replies': reply}}, True)

def create_geo_url(status):
    dstk_base = 'http://www.datasciencetoolkit.org/maps/api/geocode/json'
    dstk_tail = 'sensor=false'
    coordinates = filter(bool,[status['geo'], status['coordinates']])
    if coordinates:
        lat = coords['coordinates'][0]
        lon = coords['coordinates'][1]
        url = "%s?latlng=%s,+%s&%s" % (dstk_base, lat, lon, dstk_tail)

    elif status['place']:
        split = status['place']['full_name'].split(', ')
        city = split[0]
        state = split[1]
        country = status['place']['country']
        url = "%s?%s,+%s,+%s&%s" % (dstk_base, city, state, country, dstk_tail)

    elif status['user']['location']:
        location = status['user']['location']
        url = "%s?address=%s&%s" % (dstk_base, location, dstk_tail)
        url = re.sub('\s+', '+', url)
        url = re.sub(',', '+', url)

    else:
        return None

    return url

@tornado.gen.coroutine
def tweet_callback(status):
    """Callback fired on data from the Twitter streaming API"""

    try:
        status = json.loads(status)
        url = create_geo_url(status)
        text = status['text']

        if text.startswith('RT') or not url or 'http' in text:
            return

        if GLOBALS['sockets']:
            http_client = tornado.httpclient.AsyncHTTPClient()
            response = yield http_client.fetch(url)
            handle_request(response, status)
            insert_tweet(status)

    except:
        pass


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
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
        GLOBALS['sockets'].append(self)
        global twitUser
        if twitUser != None:
            GLOBALS['users'].append(twitUser)
        print "WebSocket opened"

    def on_close(self):
        print "WebSocket closed"
        GLOBALS['sockets'].remove(self)


class Announcer(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        data = self.get_argument('data')
        for socket in GLOBALS['sockets']:
            socket.write_message(data)
        self.write('Posted')


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


class PostHandler(tornado.web.RequestHandler,
                    tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def put(self, tweet_id):
        oAuthToken = self.get_secure_cookie('oauth_token')
        oAuthSecret = self.get_secure_cookie('oauth_secret')
        user_id = self.get_secure_cookie('user_id')
        tweet = json.loads(self.request.body)

        if oAuthToken and oAuthSecret:
            accessToken = {
                'key': oAuthToken,
                'secret': oAuthSecret
            }
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
            # Call failed; perhaps missing permission?
            self.authorize_redirect()
            return


stream = twitstream.twitstream(
            method, options.username, options.password,
            tweet_callback, defaultdata=args[1:],
            debug=options.debug, engine=options.engine
        )

settings = dict(
    twitter_consumer_key=settings['CONSUMER_KEY'],
    twitter_consumer_secret=settings['CONSUMER_SECRET'],
    cookie_secret=settings['COOKIE_SECRET'],
    template_path=os.path.join( os.path.dirname( __file__ ), 'templates'),
    static_path=os.path.join(os.path.dirname(__file__), "static")
)

if __name__ == "__main__":
	app = tornado.web.Application(
		handlers = [
            (r"/", IndexHandler),
            (r"/planet", MainHandler),
            (r"/login", TwitterHandler),
            (r"/post/([0-9]+)", PostHandler),
            (r"/socket", ClientSocket),
            (r"/push", Announcer),
            (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": "./static"}),
        ],
        **settings
	)
	http_server = tornado.httpserver.HTTPServer(app)
	http_server.listen(9000)
	stream.run()
