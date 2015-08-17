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
from tornado import websocket
import twitstream
import dstk
import pymongo
from geopy.geocoders import GoogleV3

from config import settings

client = pymongo.MongoClient('localhost', 27017)
db = client.lonely_planet

clients = []
users = []

(options, args) = twitstream.parser.parse_args()
twit_user = None
authenticated = False
ds = dstk.DSTK({'apiBase': "http://ec2-54-147-255-11.compute-1.amazonaws.com"})
geo = GoogleV3()

if not args:
    args = ['track', 'lonely']
    method = 'track'
else:
    method = args[0]
    if method not in twitstream.GETMETHODS and \
            method not in twitstream.POSTPARAMS:
        raise NotImplementedError("Unknown method: %s" % method)


def insert_tweet(status):
    """ Inserts tweet into Mongo """
    status['replies'] = []
    return db.tweets.insert(status)


def add_tweet_reply(tweet_id, user, text):
    """ Adds a reply to the saved tweet """
    reply = {'user': user, 'text': text}
    return db.tweets.update(
        {'id_str': tweet_id}, {'$push': {'replies': reply}}, True)


def create_dstk_geo_url(status):
    """ Creates a url for the DSTK google-style geocoder

    Args:
        status: Dict of the tweet

    Returns:
        url: String to send to the DSTK geocoder
    """
    dstk_base = 'http://ec2-54-147-255-11.compute-1.amazonaws.com/maps/api/geocode/json'
    dstk_tail = 'sensor=false'
    coordinates = filter(bool, [status['geo'], status['coordinates']])
    url = None

    if coordinates:
        lat = coords['coordinates'][0]
        lon = coords['coordinates'][1]
        url = "%s?latlng=%s,+%s&%s" % (dstk_base, lat, lon, dstk_tail)

    elif status['place']:
        split = status['place']['full_name'].split(',')
        city = split[0].strip()
        state = split[1].strip()
        country = status['place']['country']
        url = "%s?%s,%s,%s&%s" % (dstk_base, city, state, country, dstk_tail)

    elif status['user']['location']:
        location = status['user']['location']
        url = "%s?address=%s&%s" % (dstk_base, location, dstk_tail)
        url = re.sub('\s+', '+', url)
        url = re.sub(',', '+', url)

    return url


def create_google_components(status):
    """ Creates a components dict for the google geocoder

    Args:
        status: Dict of the tweet

    Returns:
        components: Dict of location components
    """
    components = None

    if status['place']:
        split = status['place']['full_name'].split(',')
        components = {
            'locality': split[0].strip(),
            'administrative_area': split[1].strip(),
            'country': status['place']['country']
        }

    elif status['user'].has_key('location'):
        split = status['user']['location'].split(',')
        components = {
            'locality': split[0].strip(),
            'administrative_area': split[1].strip()
        }

    print "component is %r" % components

    return components


def handle_dstk_geocoding(response, status):
    """ Checks if the DSTK has returned a response

    Args:
        response: Dict of dstk geocoder response
        status: Dict of the tweet

    Returns:
        status: Dict of the geocoding tweet
    """
    if response.error:
        print "Error:", response.error
    else:
        res = json.loads(response.body)
        if res['status'] == "OK":
            status['lp_geo'] = res['results'][0]
            return status


def dstk_geocode(status):
    """ Uses the DSTK to geocode the tweet

    Args:
        status: Dict of the tweet

    Returns:
        geocoded_status: Dict of geocoded status (or None)
    """
    url = create_dstk_geo_url(status)

    if url:
        http_client = tornado.httpclient.AsyncHTTPClient()
        response = yield http_client.fetch(url)
        geocoded_status = handle_dstk_geocoding(response, status)

        # return geocoded_status


def google_geocode(status):
    """ Uses the Google V3 geocoder to geocode the tweet

    Args:
        status: Dict of the tweet

    Returns:
        geocoded_status: Dict of geocoded status (or None)
    """
    components = create_google_components(status)

    if components:
        response = geo.geocode("", components=components)

        if hasattr(response, 'raw'):
            status['lp_geo'] = response.raw

            return status


def broadcast(data):
    """ Pushes data to all connected clients """
    for client in clients:
        client.write_message(data)


@tornado.gen.coroutine
def tweet_callback(status):
    """ Callback fired on data from the Twitter streaming API.
    Filters out tweets with RTs or urls in them, geocodes them
    if they have location information, and pushes the geocoded
    tweets out to connected clients

    Args:
        status: Dict of tweet information

    """
    # If the tweet pulled from the stream is complete:
    if status[-3].endswith('}'):
        status = json.loads(status)
        text = status['text']

        # If clients are connected and the tweet doesn't
        # contain a url or start with an RT
        if clients and not text.startswith('RT') and not 'http' in text:
            # Geocoding
            geocoded_status = google_geocode(status)

            if geocoded_status:
                broadcast(geocoded_status)
                # insert_tweet(status)


stream = twitstream.twitstream(
    method, options.username, options.password,
    tweet_callback, defaultdata=args[1:],
    debug=options.debug, engine=options.engine)


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
        clients.append(self)

        if twit_user:
            users.append(twit_user)

    def on_close(self):
        clients.remove(self)


class Announcer(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        data = self.get_argument('data')
        for client in clients:
            client.write_message(data)
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
            (r"/logout", LogoutHandler),
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
