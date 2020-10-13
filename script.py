# A simple python script to extract names, and emails from
# a certain online directory

import os, json
from bs4 import BeautifulSoup

#get a list of the files in the current directory
inputfiles = os.listdir(os.getcwd())

def postproc(inputfiles):

#for every file in the directory
  for i in inputfiles:

#call the preproc function on said file and generate the appropriate outfile
	preproc(i, "out"+str(inputfiles.index(i))+".txt")

def preproc(infile, outfile):

	# open the infile for reading
    file = open(infile, 'r')

    # convert the infile to soup object
	soup = BeautifulSoup(file)

	# find all <strong></strong> elements
	strongs = soup.select('strong')

	# find all mailto (email) elements
	mailtos = soup.select('a[href^=mailto]')

	# prep variables for subsequent stages i process
	prenames = []
	names = []
	emails = []
	contactzip = []
	jsondump = []

	# Extract names
	for i in strongs:
  		for j in i:
    		prenames.append(j.string)

	for i in prenames:
  		if prenames.index(i)%2 != 0:
    		if i.string != None:
      			if i != '\n':
        			names.append(i.string.encode('utf-8').strip())

	# Extract emails
	for i in mailtos:
  		if i.string != None:
    		emails.append(i.string.encode('utf-8').strip())

	# zip together names,emails into a list of lists
	contactzip = zip(emails, names)

	# convert list of lists to json for processing by ponymailer
	jsondump = json.dumps(contactzip)

	# write to file
	with open(outfile, 'w') as file:
  		file.write(jsondump)

# run the script
postproc(inputfiles)
