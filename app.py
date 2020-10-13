import boto3
import json
from flask import Flask, jsonify, request, render_template
from bs4 import BeautifulSoup
from re import search

app = Flask(__name__)
txt = ""

comprehend = boto3.client(
    service_name='comprehend',
    region_name='us-east-1',
    aws_access_key_id='AKIAJBDRJ5D3SJ434B6Q',
    aws_secret_access_key='fG18x0JSMyYofb6rIdDla3YY5Ud3UT30dFWdRbJg',
    #aws_session_token=SESSION_TOKEN
)

# Display your index page
@app.route("/")
def index():
    return render_template('/index.html', message="Gmail Recruiting")

@app.route('/hello', methods=['GET', 'POST'])
def hello():
    # POST request
    if request.method == 'POST':
        high = -1
        highOrg = ""
        print('Incoming..')
        #print(request.get_data())
        soup = BeautifulSoup(request.get_data(), features="lxml")
        txt = soup.get_text()
        response_entity = comprehend.detect_entities(
            LanguageCode="en",
            Text=txt
        )
        print('Calling DetectEntities')
        #print(json.dumps(response_entity, sort_keys=True, indent=4))
        obj = json.loads(json.dumps(response_entity, sort_keys=True, indent=4))['Entities']
        # print the keys and values
        for i in obj:
            if (i['Type'] == 'ORGANIZATION'):
                if (i['Score'] > high):
                    high = i['Score']
                    print(str(i['Score']) + "   " + i['Text'])
                    highOrg = i['Text']
                    if (highOrg == 'LinkedIn'):
                        if ((txt.find('The LinkedIn Talent Acquisition Team') or txt.find('application was sent to LinkedIn') == False)):
                            highOrg = "Cannot Detect"
                    elif (highOrg == ''):
                        highOrg = "Cannot Detect"

        with open('static/Positions.txt', mode='r') as f:
            for row in f:
                row = row.replace('\n', '')
                if ('figma' in txt.lower()):
                    print(txt.lower().replace('\n', ''))
                    break
                if row.lower() in txt.lower().replace('\n', ''):
                    highOrg = highOrg + '/' + row
                    print("THIS IS A TEST OF POSITIONS: " + row)
                    break
                    # Comment the break above to have a list of all applicable positions
        
        f.close()
        print('End of DetectEntities\n')
        return highOrg, 200

    # GET request
    else:
        text = {'greeting':'Hello from Flask!'}
        return jsonify(text)  # serialize and use JSON headers


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=80)