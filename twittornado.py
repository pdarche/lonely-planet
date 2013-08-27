import oauth.oauth as oauth
import socket
import base64
import urllib
import sys
from urlparse import urlparse
from tornado import iostream, ioloop
try:
    import json
except ImportError:
    import simplejson as json
import ssl

# Yes, this is very strongly based upon the twitasync approach.
# There was little call to change my approach on a first pass,
# and the IOStream interface is very similar to asyncore/asynchat.

USERAGENT = "twitstream.py (http://www.github.com/atl/twitstream), using tornado.iostream"
CONSUMER_KEY="xWD4yOjKIewNQZA9RnqqPA"
CONSUMER_SECRET="sViJYr85dwE1qqX0k0j8SwGdqBaR5I7lC0xkz2bmQ"
ACCESS_KEY = "956317314-eIqms8Po5juezYhyYL7YEieig5Km2zCFmFWQk17n"
ACCESS_SECRET = "1R2nBRAQbu35DLKqffiZYzTOqX3G5pvGMmcagtJk" 
RESOURCE_URL = 'https://stream.twitter.com/1/statuses/filter.json'

def build_oauth_header(params):
    return "OAuth " + ", ".join(
            ['%s="%s"' % (k, v) for k, v in params.iteritems()]) #urllib.quote(v))

class TwitterStreamGET(object):
    def __init__(self, user, pword, url, action, debug=False, preprocessor=json.loads):
        self.authkey = base64.b64encode("%s:%s" % (user, pword))
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
            self.connect( self.proxy )
        else:
            self.connect( (self.host, 443) )
    
    @property
    def request(self):
        request  = 'GET %s HTTP/1.1\r\n' % self.url
        request += 'Authorization: Basic %s\r\n' % self.authkey
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
            if self.preprocessor:
                a = self.preprocessor(data)
            else:
                a = data
            self.action(a)
            print a
        if self.debug:
            print >> sys.stderr, data
        self.stream.read_until(self.terminator, self.found_terminator)

    def run(self):
        self.stream.write(self.request)
        self.stream.read_until(self.terminator, self.found_terminator)
        ioloop.IOLoop.instance().start()
    
    def cleanup(self):
        self.stream.close()


class TwitterStreamPOST(TwitterStreamGET):
    def __init__(self, user, pword, url, action, data=tuple(), debug=False, preprocessor=json.loads):
        TwitterStreamGET.__init__(self, user, pword, url, action, debug, preprocessor)
        self.data = data

    @property
    def request(self):
        data = urllib.urlencode(self.data)
        request  = 'POST %s HTTP/1.0\r\n' % self.url
        request += 'Authorization: Basic %s\r\n' % self.authkey
        request += 'Accept: application/json\r\n'
        request += 'User-Agent: %s\r\n' % USERAGENT
        request += 'Content-Type: application/x-www-form-urlencoded\r\n'
        request += 'Content-Length: %d\r\n' % len(data)
        request += '\r\n'
        request += '%s' % data
        print "the request is %r" % request
        return request

class TwitterStreamOAuthPOST(TwitterStreamGET):
    def __init__(self, user, pword, url, action, data=tuple(), debug=False, preprocessor=json.loads):
        TwitterStreamGET.__init__(self, user, pword, url, action, debug, preprocessor)
        self.data = data

    @property
    def request(self):
        oauth_header = self.create_oauth_header()
        data = urllib.urlencode(self.data)
        request  = 'POST %s HTTP/1.1\r\n' % '/1/statuses/filter.json' #self.url
        request += 'Accept: */*\r\n'
        request += 'User-Agent: %s\r\n' % USERAGENT
        request += 'Content-Type: application/x-www-form-urlencoded\r\n'
        request += 'Authorization: %s\r\n' % oauth_header['Authorization']
        request += 'Content-Length: %d\r\n' % len(data)
        request += 'Host: stream.twitter.com \r\n'
        request += '\r\n'
        request += '%s' % data
        return request

    def create_oauth_header(self):
        signature_method_hmac_sha1 = oauth.OAuthSignatureMethod_HMAC_SHA1()
        consumer = oauth.OAuthConsumer(CONSUMER_KEY, CONSUMER_SECRET)
        token = DictObj()
        token.key = ACCESS_KEY
        token.secret = ACCESS_SECRET
        parameters = self.data
        oauth_request = oauth.OAuthRequest.from_consumer_and_token(
                consumer,
                token=token,
                http_method='POST',
                http_url=RESOURCE_URL,
                parameters=parameters
            )
        # print signature_method_hmac_sha1.build_signature_base_string(oauth_request, consumer, token)
        oauth_request.sign_request(signature_method_hmac_sha1, consumer, token)

        print to_header(oauth_request.parameters)['Authorization']
        return to_header(oauth_request.parameters)

def to_header(parameters, realm=''):
    """
    Serialize as a header for an HTTPAuth request.
    """
    # auth_header = 'OAuth realm="%s"' % realm
    auth_header = 'OAuth '
    param_list = parameters.keys()
    param_list.sort()
    # Add the oauth parameters.
    if parameters:
        for k in param_list:
            if k[:6] == 'oauth_':
                auth_header += '%s="%s", ' % (k, parameters[k])
    return {'Authorization': auth_header[:-2]}

class Struct:
    def __init__(self, **entries): 
        self.__dict__.update(entries)

class DictObj(object):
    def __getattr__(self, attr):
        return self.__dict__.get(attr)        
