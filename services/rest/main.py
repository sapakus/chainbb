from flask import Flask, jsonify, request
from pprint import pprint
from pymongo import MongoClient
from bson.json_util import dumps
from flask_cors import CORS, cross_origin
from mongodb_jsonencoder import MongoJsonEncoder

app = Flask(__name__)
app.json_encoder = MongoJsonEncoder
CORS(app)
mongo = MongoClient("mongodb://mongo")
db = mongo.forums

def response(json, forum=False):
    # Load height
    # NYI - should be cached at for 3 seconds
    height = db.status.find_one({'_id': 'height'})
    response = {
        'status': 'ok',
        'height': height['value'],
        'data': json
    }
    if forum:
        response.update({
            'forum': forum
        })
    return jsonify(response)

def load_post(author, permlink):
    # Load the post by author/permlink
    query = {
        'author': author,
        'permlink': permlink
    }
    post = db.posts.find_one(query)
    if post and 'active_votes' in post:
        # A dict to store vote information
        votes = {}
        # Loop over current votes and add them to the new simple dict
        for vote in post['active_votes']:
            votes.update({vote[0]: vote[1]})
        # Remove old active_votes
        post.pop('active_votes', None)
        # Add the new simple votes
        post.update({
            'votes': votes
        })
    return post

def load_replies(query, sort):
    replies = []
    results = db.replies.find(query).sort(sort)
    for idx, post in enumerate(results):
        if post and 'active_votes' in post:
            # A dict to store vote information
            votes = {}
            # Loop over current votes and add them to the new simple dict
            for vote in post['active_votes']:
                votes.update({vote[0]: vote[1]})
            # Remove old active_votes
            post.pop('active_votes', None)
            # Add the new simple votes
            post.update({
                'votes': votes
            })
            replies.append(post)
    return replies

@app.route("/")
def index():
    query = {
      "group": {"$in": ["chainbb", "general", "creative", "interests"]}
    }
    sort = [("group_order",1),("forum_order",1)]
    results = db.forums.find(query).sort(sort)
    return response(list(results))

@app.route("/crypto")
def crypto():
    query = {
      "group": {"$in": ["chainbb", "crypto-general", "crypto-index"]}
    }
    sort = [("group_order",1),("forum_order",1)]
    results = db.forums.find(query).sort(sort)
    return response(list(results))

@app.route("/steem")
def steem():
    query = {
      "group": {"$in": ["steem-general", "steem-projects"]}
    }
    sort = [("group_order",1),("forum_order",1)]
    results = db.forums.find(query).sort(sort)
    return response(list(results))

@app.route("/tags")
def tags():
    query = {}
    sort = [("last_reply",-1)]
    results = db.topics.find(query).sort(sort)
    return response(list(results))

@app.route("/search")
def search():
    pipeline = [
      {
        '$match': {
          '$text': {
            '$search': request.args.get('q')
          }
        }
      },
      {
        '$sort': {
          'score': {
            '$meta': "textScore"
          }
        }
      },
      {
        '$project': {
          'title': '$title',
          'description': '$url'
        }
      },
      {
        '$limit': 5
      }
    ]
    results = db.posts.aggregate(pipeline)
    return response(list(results))

@app.route('/forum/<slug>')
def forum(slug):
    # Load the specified forum
    query = {
        '_id': slug
    }
    forum = db.forums.find_one(query)
    # Load the posts
    query = {}
    if 'tags' in forum and len(forum['tags']) > 0:
        query.update({
            'category': {
                '$in': forum['tags']
            }
        })
    if 'accounts' in forum and len(forum['accounts']) > 0:
        query.update({
            'author': {
                '$in': forum['accounts']
            }
        })
    fields = {
        'author': 1,
        'category': 1,
        'created': 1,
        'children': 1,
        'json_metadata': 1,
        'last_reply': 1,
        'last_reply_by': 1,
        'permlink': 1,
        'title': 1,
        'url': 1
    }
    sort = [("active",-1)]
    page = int(request.args.get('page', 1))
    perPage = 20
    skip = (page - 1) * perPage
    limit = perPage
    results = db.posts.find(query, fields).sort(sort).skip(skip).limit(limit)
    return response(list(results), forum=forum)

@app.route('/topics/<category>')
def topics(category):
    query = {
        'category': category
    }
    fields = {
        'author': 1,
        'created': 1,
        'json_metadata': 1,
        'last_reply': 1,
        'last_reply_by': 1,
        'permlink': 1,
        'title': 1,
        'url': 1
    }
    sort = [("last_reply",-1),("created",-1)]
    results = db.posts.find(query, fields).sort(sort).limit(20)
    return response(list(results))

@app.route('/<category>/@<author>/<permlink>')
def post(category, author, permlink):
    # Load the specified post
    post = load_post(author, permlink)
    # Load the specified forum
    query = {
        'tags': {'$in': [post['category']]}
    }
    forum = db.forums.find_one(query)
    return response(post, forum=forum)

@app.route('/<category>/@<author>/<permlink>/responses')
def responses(category, author, permlink):
    query = {
        'root_post': author + '/' + permlink
    }
    sort = [
        ('created', 1)
    ]
    return response(list(load_replies(query, sort)))

@app.route('/active')
def active():
    query = {

    }
    fields = {
        'author': 1,
        'category': 1,
        'children': 1,
        'created': 1,
        'last_reply': 1,
        'last_reply_by': 1,
        'permlink': 1,
        'title': 1,
        'url': 1
    }
    sort = [("last_reply",-1),("created",-1)]
    limit = 20
    results = db.posts.find(query, fields).sort(sort).limit(limit)
    return response(list(results))

@app.route('/height')
def height():
    query = {
        '_id': 'height'
    }
    return response(db.status.find_one(query))

@app.route("/config")
def config():
    results = db.forums.find()
    return response(list(results))


if __name__ == "__main__":
    app.run(host= '0.0.0.0', debug=True)
