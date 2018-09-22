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


import json
import math

app = Flask(__name__)


def is_ipv6(addr):
    """Checks if a given address is an IPv6 address."""
    try:
        socket.inet_pton(socket.AF_INET6, addr)
        return True
    except socket.error:
        return False


# [START example]
# Environment variables are defined in app.yaml.
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['SQLALCHEMY_DATABASE_URI']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

print('SQLALCHEMY_DATABASE_URI', os.environ['SQLALCHEMY_DATABASE_URI'])

db = SQLAlchemy(app)

@app.route('/foo')
def index():

#    result = db.engine.execute(text("<sql here>").execution_options(autocommit=True))

    results = db.engine.execute(text('SELECT sum(Registered_Voters) as vcount FROM voters WHERE town=:town'), town = 'dedham')


    for row in results:
        print(row)
        vcount = int(row['vcount'])


    jsondata = { "registered": vcount,
                "voted": math.floor(vcount * 0.4),
                "town": 'dedham',
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

