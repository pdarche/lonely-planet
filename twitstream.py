import oauth.oauth as oauth
import sys
import getpass
import itertools
from functools import partial
from collections import defaultdict
from twittornado import TwitterStreamGET, TwitterStreamOAuth2POST

GETMETHODS  = ['firehose',
               'gardenhose',
               'spritzer',
               'retweet',
               'links',
               'user',]

POSTPARAMS  = {'birddog': 'follow',
               'shadow':  'follow',
               'follow':  'follow',
               'track':   'track',}

def constant_factory(value):
    return itertools.repeat(value).next

BASEURL = defaultdict(constant_factory("https://stream.twitter.com/%s.json"))
BASEURL['user'] = "https://chirpstream.twitter.com/%s.json"

METHODPATH = {
        'firehose': '1.1/statuses/firehose',
        'gardenhose': '1.1/statuses/sample',
        'spritzer': '1.1/statuses/sample',
        'birddog': '1.1/statuses/filter',
        'shadow': '1.1/statuses/filter',
        'follow': '1.1/statuses/filter',
        'track': '1.1/statuses/filter',
        'filter': '1.1/statuses/filter',
        'retweet': '1.1/statuses/retweet',
        'links': '1.1/statuses/links',
        'user': '2b/user'
    }


def twitstream(method, action, defaultdata=[],
                        debug=False, engine='async', **kwargs):
    '''General function to set up an asynchat object on twitter. Chooses GET or
    POST according to the API method.

    Parameter action is a callable that takes a dict derived from simplejson.

    Parameter defaultdata expects an iterable of strings as the default parameter
    (follow or track) on a POST method. If there are additional parameters you
    wish to use, they can be passed in **kwargs.'''

    url = BASEURL[method] % METHODPATH[method]
    data = {POSTPARAMS[method]: ','.join(defaultdata)}
    data.update(kwargs)
    return TwitterStreamOAuth2POST(url, action, data, debug)


