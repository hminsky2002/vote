# Copyright 2015, 2018 Google Inc. All Rights Reserved.
#
# Test opening a connection using sqlalchemy

import datetime
import logging
import os
import socket

from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
import sqlalchemy

from sqlalchemy.sql import text
import sqlalchemy
from sqlalchemy import create_engine
from flask import request


import json
import math

app = Flask(__name__)

# [START example]
# Environment variables are defined in app.yaml.
if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['SQLALCHEMY_DATABASE_URI']
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:theusual@/voter'


app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


print('SQLALCHEMY_DATABASE_URI', os.environ['SQLALCHEMY_DATABASE_URI'])

db = SQLAlchemy(app)

@app.route('/sql/newsql')
def index():

#    result = db.engine.execute(text("<sql here>").execution_options(autocommit=True))

    town = request.args.get('town')

    results = db.engine.execute(text('SELECT sum(Registered_Voters) as vcount FROM voters WHERE town=:town'), town = town)


    for row in results:
        print(row)
        vcount = int(row['vcount'])


    jsondata = { "registered": vcount,
                "voted": math.floor(vcount * 0.4),
                "town": town,
                "year": 2016 }

    output =  json.dumps(jsondata)

    return output, 200, {'Content-Type': 'text/plain; charset=utf-8'}
# [END example]


@app.errorhandler(500)
def server_error(e):
    logging.exception('An error occurred during a request.')
    return """
    An internal error occurred: <pre>{}</pre>
    See logs for full stacktrace.
    """.format(e), 500


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)

