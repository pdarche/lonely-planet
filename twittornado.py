import oauth.oauth as oauth
import oauth2
import time
import socket
import base64
import urllib
import sys
from urlparse import urlparse
from tornado import iostream, ioloop
from config import settings
import json
import ssl


USERAGENT = "twitstream.py, using tornado.iostream"
RESOURCE_URL = 'https://stream.twitter.com/1.1/statuses/filter.json'

class TwitterStreamGET(object):
    def __init__(self, url, action, debug=False, preprocessor=json.loads):
        self.preprocessor = preprocessor
        self.url = url
        self.host = urlparse(url)[1]
        try:
            proxy = urlparse(urllib.getproxies()['https'])[1].split(':')
            proxy[1] = int(proxy[1]) or 443
            self.proxy = tuple(proxy)
        except:
            self.proxy = None
        self.action = action
        self.debug = debug
        self.terminator = "\r\n"
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
        self.stream = None
        if self.proxy:
            self.connect(self.proxy)
        else:
            self.connect((self.host, 443))

    @property
    def request(self):
        request  = 'GET %s HTTP/1.1\r\n' % self.url
        request += 'Accept: application/json\r\n'
        request += 'User-Agent: %s\r\n' % USERAGENT
        request += '\r\n'
        return request

    def connect(self, host):
        self.sock.connect(host)
        self.sock = ssl.wrap_socket(self.sock, do_handshake_on_connect=False)
        self.stream = iostream.SSLIOStream(self.sock)

    def found_terminator(self, data):
        if data.startswith("HTTP/1") and not data.endswith("200 OK\r\n"):
            print >> sys.stderr, data
        if data.startswith('{'):
            self.action(data)
        if self.debug:
            print >> sys.stderr, data
        self.stream.read_until(self.terminator, self.found_terminator)

    def run(self):
        self.stream.write(self.request)
        self.stream.read_until(self.terminator, self.found_terminator)
        ioloop.IOLoop.instance().start()

    def cleanup(self):
        self.stream.close()


class TwitterStreamOAuth2POST(TwitterStreamGET):
    def __init__(self, url, action, data=tuple(), debug=False, preprocessor=json.loads):
        TwitterStreamGET.__init__(self, url, action, debug, preprocessor)
        self.data = data

    @property
    def request(self):
        oauth_header = self.create_oauth_header(self.data)
        data = urllib.urlencode(self.data)
        request  = 'POST %s HTTP/1.1\r\n' % self.url
        request += 'Accept: */*\r\n'
        request += 'User-Agent: %s\r\n' % USERAGENT
        request += 'Content-Type: application/x-www-form-urlencoded\r\n'
        request += 'Authorization: %s\r\n' % str(oauth_header['Authorization'])
        request += 'Content-Length: %d\r\n' % len(data)
        request += 'Host: stream.twitter.com \r\n'
        request += '\r\n'
        request += '%s' % data
        return request

    def create_oauth_header(self, data):
        consumer = oauth2.Consumer(
            key=settings['CONSUMER_KEY'],secret=settings['CONSUMER_SECRET'])
        token = oauth2.Token(
            settings['OAUTH_TOKEN'], settings['OAUTH_SECRET'])

        params = {
            'oauth_version': "1.0",
            'oauth_nonce': oauth2.generate_nonce(),
            'oauth_timestamp': int(time.time()),
            'oauth_token': token.key,
            'oauth_consumer_key': consumer.key,
            'track': data['track']
        }

        oauth_req = oauth2.Request(method="POST", url=RESOURCE_URL, parameters=params)
        signature_method = oauth2.SignatureMethod_HMAC_SHA1()
        oauth_req.sign_request(signature_method, consumer, token, include_body_hash=False)
        headers = oauth_req.to_header()
        return headers

