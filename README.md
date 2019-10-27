# vote
relativotey source code


alias deploy="yes Y | time gcloud app deploy --version test"

export GOOGLE_APPLICATION_CREDENTIALS="/path-to-creds-file/votedb-0e1502f3644a.json"

deploy-save changes
gcloud app browse-open app in browser

