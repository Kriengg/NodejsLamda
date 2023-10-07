//*********************************************************************************************************************
// Author - Krishn Sharma
// This lambda script will open an S3 trigger JSON, pull out info and log in cloudwatch + send an email via SES
//
// Important - Ensure that the lambda role includes full access to CloudWatchFullAccess and AmazonSESFullAccess
//             You can create this role before hand and use it at the time of creating the lambda function
//             Use node runtime 10 while creating the function using the AWS management console
//
// Note - this script is provided as part of the training and carries no warranties, use at your own risk.
//*********************************************************************************************************************
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: 'ca-central-1' });
const selfEmail = "heloo@gmail.com"; // Add proper email after creating SES identity

String.prototype.format = function () {
   var content = this;
   for (var i = 0; i < arguments.length; i++) {
        var replacement = '{' + i + '}';
        content = content.replace(replacement, arguments[i]);
   }
   return content;
};

export const handler = async (event) => {
    console.log('The event looks like ' + JSON.stringify(event));
    if (event.Records[0].eventSource == "aws:s3") {
      console.log('The event was called from S3');
      var bucket = event.Records[0].s3.bucket.name;
      var s3evt = event.Records[0].eventName;
      var filename = event.Records[0].s3.object.key;
    }
    // In the line below, you need to keep EventSource (uppercase E)
    else if (event.Records[0].EventSource == "aws:sns") {
      console.log('The event was called from SNS');
      var s3message = JSON.parse(event.Records[0].Sns.Message);
      console.log('The parsed S3 event is ' + JSON.stringify(s3message))
      var bucket = s3message.Records[0].s3.bucket.name;
      var s3evt = s3message.Records[0].eventName;
      var filename = s3message.Records[0].s3.object.key;
    }

    var msg = 'The S3 bucket {0} had {1} operation with the object key {2}'.format(bucket, s3evt, filename);
    console.log(msg);

    var eParams = {
        Destination: { ToAddresses: [selfEmail] },
        Message: {
            Body: { Text: { Charset: "UTF-8", Data: msg } },
            Subject: { Charset: "UTF-8", Data: "S3 bucket event" }
        },
        Source: selfEmail
    };

    console.log("Sending email");
    try {
        const emailResponse = await sesClient.send(new SendEmailCommand(eParams));
        console.log('Email response: ', emailResponse);
    } catch (err) {
        console.log("ERROR sending the email");
        console.log(err);
    }

    const response = {
        statusCode: 200,
        body: JSON.stringify('Execution complete'),
    };
    return response;
};
