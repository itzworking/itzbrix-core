AWS_PROFILE=itzbrix

deploy\:all:
	node ./bin/cdk.js deploy --all --profile $(AWS_PROFILE) --concurrency 6
