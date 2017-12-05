Grade report uses extracts from D2L's Brightspace to generate a 
student report card.

# Data

The report requires two extracts to be performed from D2L: grades and 
attendance.

## Attendance

When setting up attendance for your class shell, ensure to title your 
attendance items with the relenvant date. While this may be a 
nuisance for repeating classes, this is the only mechanism for tying 
a date to the attendance.

Assuming the dates have been added as titles, a standard attendance 
extract can be imported into the report.

## Grades

Exports of grades from Brightspace do not have any date information 
associated with them, this makes it difficult to communicate progress 
through the course to students. In order to communicate this 
information, dates must be added to the grades information. 

To add dates

1. insert a row, immediately after the header 
2. Apply dates (ISO 8601) under the appropriate assignment

The dates will be associated with whichever date they are under.

When exporting grades data, ensure you include all student data as 
well as the point format. The grades calculation is based off of the 
points, and weights are dynamically calculated.
