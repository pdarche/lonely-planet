
import tornado.auth
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.web

class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        user_json = self.get_secure_cookie("user")
        return tornado.escape.json_decode(user_json)


class MainHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        name = tornado.escape.xhtml_escape(self.current_user["name"])
        self.write("Hello, " + name)


class AuthHandler(BaseHandler, tornado.auth.GoogleMixin):
    @tornado.web.asynchronous
    def get(self):
        if self.get_argument("openid.mode", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))
            return
        self.authenticate_redirect()

    def _on_auth(self, user):
        if not user:
            self.send_error(500)
        self.set_secure_cookie("user", tornado.escape.json_encode(user))
        self.redirect("/")


application = tornado.web.Application([
            (r"/", MainHandler),
            (r"/login", AuthHandler)],
            cookie_secret="32oETzKXQAGaYdkL5gEmGeJJFuYh7EQnp2XdTP1o/Vo=",
            login_url="/login",
        )

if __name__ == '__main__':
    application.listen(9000)
    tornado.ioloop.IOLoop.instance().start()
