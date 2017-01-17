#!/bin/bash
# Adapted from https://gist.github.com/domenic/ec8b0fc8ab45f39403dd.

set -e

function build {
  npm run docs
}

function getJsonVal () {
    python -c "import json,sys;sys.stdout.write(json.dumps(json.load(sys.stdin)$1))";
}

# Ignore Travis checking PRs
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "deploy.sh: Ignoring PR build"
  build
  exit 0
fi

# Ignore travis checking other branches irrelevant to users
if [ "$TRAVIS_BRANCH" != "master" -a "$TRAVIS_BRANCH" != "indev" ]; then
  echo "deploy.sh: Ignoring push to another branch than master/indev"
  build
  exit 0
fi

SOURCE=$TRAVIS_BRANCH

# Make sure tag pushes are handled
if [ -n "$TRAVIS_TAG" ]; then
  echo "deploy.sh: This is a tag build, proceeding accordingly"
  SOURCE=$TRAVIS_TAG
fi

REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

TARGET_BRANCH="gh-pages"

# Checkout the repo in the target branch so we can build docs and push to it
git clone $REPO out -b $TARGET_BRANCH
cd out
cd ..

# Build the docs
build

# Move the generated JSON file to the newly-checked-out repo, to be committed
# and pushed

VERSION=`cat package.json | getJsonVal "['version']" | tr -d '"'`

mkdir -p out/$SOURCE

rm -r out/$SOURCE
mkdir out/$SOURCE
mv -vf docs/DiscordForge/$VERSION/* out/$SOURCE

# Commit and push
cd out
git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"

git add .
git commit -m "Docs build: ${SHA}"

ENCRYPTED_KEY_VAR="encrypted_${ENCRYPTION_LABEL}_key"
ENCRYPTED_IV_VAR="encrypted_${ENCRYPTION_LABEL}_iv"
ENCRYPTED_KEY=${!ENCRYPTED_KEY_VAR}
ENCRYPTED_IV=${!ENCRYPTED_IV_VAR}
openssl aes-256-cbc -K $ENCRYPTED_KEY -iv $ENCRYPTED_IV -in ../deploy.enc -out deploy_key -d
chmod 600 deploy_key
eval `ssh-agent -s`
ssh-add deploy_key

# Now that we're all set up, we can push.
git push $SSH_REPO $TARGET_BRANCH
