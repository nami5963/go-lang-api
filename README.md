# go-lang-api

Go 言語の勉強用 RESTAPI リポジトリ

## ECR デプロイ

go-lang-ecr-repo という repository が作成される（cdk/ecr 参照）

```
cd cdk/ecr
aws sts assume-role --role-arn arn:aws:iam::{AWS_ACCOUNT_ID}:role/adminRoleForSts --role-session-name develop --duration-seconds $((60*60*12))
cdk deploy --profile develop
```

## Docker Image push

```
aws ecr get-login-password --profile {AWS_PROFILE} | docker login --username AWS --password-stdin {AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com
docker build -t go-lang-ecr-repo .
docker tag go-lang-ecr-repo:latest {AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/go-lang-ecr-repo:latest
docker push {AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/go-lang-ecr-repo:latest
```
