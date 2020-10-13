// Client ID and API key from the Developer Console
var CLIENT_ID = '167978326819-gsnnqp1v81rfibghsdh0b4ueuhd3igni.apps.googleusercontent.com';
var API_KEY = 'AIzaSyApyhMJ0zPJnbigI8QqttMMy3WJimTU11g';
// var FOLDER_LABEL_ID = 'Label_5515722664636593650'
var FOLDER_LABEL_ID = 'INBOX'

var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
var authorizeButton = document.getElementById('authorize_button');
var signoutButton = document.getElementById('signout_button');
var recruiterFromTitles = returnRecruiterFromTitles(); // Example: BCG Talent Team <Talent@bcg.com>
var recruiterSubjects = returnRecruiterSubjects();

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function() {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
  }, function(error) {
    appendPre(JSON.stringify(error, null, 2));
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    listLabels();
    displayRecruitingEmails();
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

/**
 * Print all Labels in the authorized user's inbox. If no labels
 * are found an appropriate message is printed.
 */
function listLabels() {
  gapi.client.gmail.users.labels.list({
    'userId': 'me'
  }).then(function(response) {
    var labels = response.result.labels;
    appendPre('Labels:');

    if (labels && labels.length > 0) {
      for (i = 0; i < labels.length; i++) {
        var label = labels[i];
        appendPre(label.name)
        if (label.id === FOLDER_LABEL_ID)  {
          document.querySelector('#folderName').innerHTML = label.name;
        }
      }
    } else {
      appendPre('No Labels found.');
    }
  });
}
// Your Full-Time Application folder ID: Label_5515722664636593650
function displayRecruitingEmails() {
  var request = gapi.client.gmail.users.messages.list({
    'userId': 'me',
    'labelIds': FOLDER_LABEL_ID,
    'maxResults': 1000
  });
  request.execute(function(response) {
    $.each(response.messages, function() {
      var messageRequest = gapi.client.gmail.users.messages.get({
        'userId': 'me',
        'id': this.id
      });
      messageRequest.execute(appendMessageRow);
    });
  });
}

const isRecruitingFromMessage = (message) => {
  if (recruiterFromTitles.some(message.includes.bind(message))) {
    return true;
  }
  return false;
}

const isRecruitingSubjectMessage = (message) => {
  lowerCaseMessage = message.toLowerCase();
  if (message.includes("Thank you for applying to"))  {
    return message.slice(25);
  } else if (message.includes("Thank you for your application to")) {
    return message.slice(33);
  } else if (message.includes("Thanks for applying to")) {
    return message.slice(message.indexOf("Thanks for applying to") + 22);
  } else if (message.includes("Thanks for thinking of")) {
    return message.slice(22);
  } else if (recruiterSubjects.some(lowerCaseMessage.includes.bind(lowerCaseMessage))) {
    return true;
  }
  return false;
}

function appendMessageRow(message) {
  var from = getHeader(message.payload.headers, 'From');
  var subject = getHeader(message.payload.headers, 'Subject');
  var body = getBody(message.payload);
  var recruitingFromMessageBool = isRecruitingFromMessage(from);
  var recruitingSubjectBool = isRecruitingSubjectMessage(subject);
  var TOP_COMPANY = "";
  var TOP_POSITION = "";

  if ((!recruitingSubjectBool && recruitingFromMessageBool) || 
  (recruitingSubjectBool && recruitingFromMessageBool) || 
  typeof(recruitingSubjectBool) === 'string') {
        
      /**
       * THE FOLLOWING IS VERY IMPORTANT!!!
       * After this, WE MUST CHECK WITH app.py to determine the Company Name and Application Status. 
       * app.py will scan the body
       * If the company name has a low confidence score OR
       * If the application status cannot be determined
       * THEN we must classify the email as non-recruiting and put it in a separate DB for user to manually verify
       * BOTH confidence score must be high and application status CANNOT be UNDEFINED.
       */

       // POST

        fetch('/hello', {

          // Declare what type of data we're sending
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },

          // Specify the method
          method: 'POST',

          body: body
        }).then(function (response) { // At this point, Flask has printed our JSON
          return response.text();
        }).then(function (text) {

          // Should be 'OK' if everything was successful
          TOP_COMPANY = text;
          console.log(TOP_COMPANY);

          if (typeof(recruitingSubjectBool) === "string")  {
            if (text.indexOf('/') === 0)  {
              TOP_COMPANY = recruitingSubjectBool.replace('!', '');
              TOP_POSITION = text.slice(text.indexOf('/')+1);
            } else if (text.indexOf('/') > 0) {
              TOP_COMPANY = recruitingSubjectBool.replace('!', '');
              TOP_POSITION = text.slice(text.indexOf('/')+1);
            } else {
              TOP_COMPANY = recruitingSubjectBool.replace('!', '');
            }
          }

          if (TOP_COMPANY.indexOf('/') != -1) {
            TOP_COMPANY = text.slice(0, text.indexOf('/'));
            TOP_POSITION = text.slice(text.indexOf('/')+1);
          }

          $('.table-inbox tbody').append(
            '<tr>\
              <td>' + getHeader(message.payload.headers, 'From') + '</td>\
              <td>\
                <a href="#message-modal-' + message.id +
                  '" data-toggle="modal" id="message-link-' + message.id + '">' +
                  getHeader(message.payload.headers, 'Subject') +
                  '</a>\
              </td>\
              <td>' + getHeader(message.payload.headers, 'Date') + '</td>\
              <td style="text-align:center;">' + TOP_COMPANY + '</td>\
              <td style="text-align:center;">' + TOP_POSITION + '</td>\
            </tr>'
          );

        });

        $('body').append(
          '<div class="modal fade" id="message-modal-' + message.id +
          '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">\
            <div class="modal-dialog modal-lg">\
              <div class="modal-content">\
                <div class="modal-header">\
                  <button type="button"\
                    class="close"\
                    data-dismiss="modal"\
                    aria-label="Close">\
                  <span aria-hidden="true">&times;</span></button>\
                <h4 class="modal-title" id="myModalLabel">' +
            getHeader(message.payload.headers, 'Subject') +
            '</h4>\
                </div>\
                <div class="modal-body">\
                  <iframe id="message-iframe-' + message.id + '" srcdoc="<p>Loading...</p>">\
                  </iframe>\
                </div>\
              </div>\
            </div>\
          </div>'
        );
    }

      $('#message-link-' + message.id).on('click', function() {
        var ifrm = $('#message-iframe-' + message.id)[0].contentWindow.document;
        $('body', ifrm).html(getBody(message.payload));
      });
}

function getHeader(headers, index) {
  var header = '';

  $.each(headers, function() {
    if (this.name === index) {
      header = this.value;
    }
  });
  return header;
}

function getBody(message) {
  var encodedBody = '';
  if (typeof message.parts === 'undefined') {
    encodedBody = message.body.data;
  } else {
    encodedBody = getHTMLPart(message.parts);
  }
  encodedBody = encodedBody.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  return decodeURIComponent(escape(window.atob(encodedBody)));
}

function getHTMLPart(arr) {
  for (var x = 0; x <= arr.length; x++) {
    if (typeof arr[x].parts === 'undefined') {
      if (arr[x].mimeType === 'text/html') {
        return arr[x].body.data;
      }
    } else {
      return getHTMLPart(arr[x].parts);
    }
  }
  return '';
}
