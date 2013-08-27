import sys
import tweepy

consumer_key="iOSFAJ9FyS7vHD5C1zlt0A"
consumer_secret="kpG9LdZJMUq0Ttdcd3hunO9JcmhesDkFXwl5hoLdE"
access_key = "956317314-bsijjq7m6SvGnn3txF4nfxKLpihRYjuUk4xQhWwm"
access_secret = "BNX3FAsLbMCZIt3a6mqTLYiRDHMrpxguy6DGJPJUA" 

auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_key, access_secret)
api = tweepy.API(auth)

class CustomStreamListener(tweepy.StreamListener):
    def on_status(self, status):
        print status.text.encode('utf-8')

    def on_error(self, status_code):
        print >> sys.stderr, 'Encountered error with status code:', status_code       
        return True # Don't kill the stream

    def on_timeout(self):
        print >> sys.stderr, 'Timeout...'
        return True # Don't kill the stream

print auth
sapi = tweepy.streaming.Stream(auth, CustomStreamListener())
# sapi.filter(track=['pizza'])
