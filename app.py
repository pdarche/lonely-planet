#!/usr/bin/env python
import tornado.web
import tornado.httpserver
import tornado.httputil
import tornado.auth
import twitstream
from tornado import websocket
from config import *
import os
import json

GLOBALS={
    'sockets': [],
    'users' : []
}

(options, args) = twitstream.parser.parse_args()

twitUser = None 
authenticated = False

if len(args) < 1:
    args = ['track', 'lonely']
else:
    method = args[0]
    if method not in twitstream.GETMETHODS and \
            method not in twitstream.POSTPARAMS:
        raise NotImplementedError("Unknown method: %s" % method)

def testFunction(status):
    try:
        status = json.loads(status)
        # todo: geocode the tweet
        # todo: add the tweet to mongo
        if len(GLOBALS['sockets']) > 0:
            for socket in GLOBALS['sockets']:
                socket.write_message(status)            
                # print "%s:\t%s\n" % (status.get('user', {})\
                #             .get('screen_name'), status.get('text'))

    # if "user" not in status:
    #     try:
    #         if options.debug:
    #             print >> sys.stderr, status
    #         return
    #     except:
    #         pass
    #     print status


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
        

class PostHandler(tornado.web.RequestHandler, tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def get(self):
        oAuthToken = self.get_secure_cookie('oauth_token')
        oAuthSecret = self.get_secure_cookie('oauth_secret') 
        userID = self.get_secure_cookie('user_id')
        text = self.get_argument("data")

        if oAuthToken and oAuthSecret:  
            accessToken = {
                'key': oAuthToken,
                'secret': oAuthSecret 
            }
            self.twitter_request(
                "/statuses/update",
                post_args={"status": text},
                access_token=accessToken,
                callback=self.async_callback(self._on_post)
            )

    def _on_post(self, new_entry):
        if not new_entry:
            # Call failed; perhaps missing permission?
            self.authorize_redirect()
            return
        self.finish("success")


stream = twitstream.twitstream(method, options.username, options.password, testFunction, 
            defaultdata=args[1:], debug=options.debug, engine=options.engine)   

settings = dict(
    twitter_consumer_key=CONSUMER_KEY,
    twitter_consumer_secret=CONSUMER_SECRET,
    cookie_secret=COOKIE_SECRET,
    template_path=os.path.join( os.path.dirname( __file__ ), 'templates'),
    static_path=os.path.join(os.path.dirname(__file__), "static")          
)

if __name__ == "__main__":

	app = tornado.web.Application(
		handlers = [
            (r"/", IndexHandler),
            (r"/planet", MainHandler),
            (r"/login", TwitterHandler),
            (r"/post", PostHandler),
            (r"/socket", ClientSocket),
            (r"/push", Announcer),
            (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": "./static"}), 
        ], 
        **settings
	)
	http_server = tornado.httpserver.HTTPServer(app)
	http_server.listen(9000)
	stream.run()
