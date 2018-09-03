import json
import csv
import string

with open('district.json', 'r') as myfile:
  data = myfile.read()

d = json.loads(data)

dist = d['csv_file']



with open('district.csv', 'wb') as csvfile:
    c = csv.writer(csvfile, delimiter=',',
                            quotechar='"', quoting=csv.QUOTE_ALL)
    for line in dist:
      c.writerow(line)

