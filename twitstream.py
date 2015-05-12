import oauth.oauth as oauth
import sys
import getpass
import itertools
from optparse import OptionParser, OptionGroup
from functools import partial
from collections import defaultdict
from twittornado import TwitterStreamGET, TwitterStreamOAuth2POST

USAGE = """%prog [options] method [params]

Public methods are 'spritzer', 'follow', and 'track'. Follow takes
user IDs as parameters, and track takes keywords."""

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
        'firehose': '1/statuses/firehose',
        'gardenhose': '1/statuses/sample',
        'spritzer': '1/statuses/sample',
        'birddog': '1/statuses/filter',
        'shadow': '1/statuses/filter',
        'follow': '1/statuses/filter',
        'track': '1/statuses/filter',
        'filter': '1/statuses/filter',
        'retweet': '1/statuses/retweet',
        'links': '1/statuses/links',
        'user': '2b/user'
    }

def DEFAULTACTION(status):
    if "user" not in status:
        try:
            if options.debug:
                print >> sys.stderr, status
            return
        except:
            pass
    # print "%s:\t%s\n" % (status.get('user', {}).get('screen_name'), status.get('text'))

def twitstream(method, user, pword, action, defaultdata=[],
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
    return TwitterStreamOAuth2POST(user, pword, url, action, data, debug)

track = partial(twitstream, 'track')

track.__doc__    = "receive all real-time mentions of any of the input terms"

parser = OptionParser(usage=USAGE)
group = OptionGroup(parser, 'credentials',
                    "All usage of the Streaming API requires user credentials. "
                    "Will prompt if either of them are missing.")
group.add_option('-p', '--password', help="Twitter password")
group.add_option('-u', '--username', help="Twitter username")
parser.add_option_group(group)
parser.add_option('--debug', action='store_true', dest='debug',
                    default=False, help="Print debug information")
egroup = OptionGroup(parser, 'engine',
                    "Selects the underlying library for asyncronous I/O.")
egroup.add_option('--tornado', action='store_const', const='tornado',
                  dest='engine', help="Use Tornado's iostream library")
parser.add_option_group(egroup)

