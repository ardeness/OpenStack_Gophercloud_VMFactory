FROM golang:1.6.2
COPY vmfactory /vmfactory/vmfactory
ADD templates /vmfactory/templates

WORKDIR /vmfactory
CMD ["./vmfactory"]
