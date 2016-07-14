
#DEPENDENCIES

#github.com/gorilla/mux
#github.com/gorilla/sessions
#github.com/rackspace/gophercloud

all: push
GOPATH=$(shell pwd)
IMAGE=dockerregistry.hae.co.kr:5000/vmfactory
TAG=v7.0

vmfactory: vmfactory.go
	go build vmfactory.go

container: vmfactory
	docker build --no-cache -t $(IMAGE):$(TAG) .

push: container
	sudo docker push $(IMAGE):$(TAG)
