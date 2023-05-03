# CSCI-3308-Team-1-Section-011-Happy-Paws
Team 1 Section 011 Final Project-Dog Adoption 

Happy Paws is a Dog Adoption website for any user within the US who would like to adopt a pet.

Contributors: Ethan Frederick, Garrett Weber, Reiland Domingue, Zack Carlstrom, Bill Martynowicz

Technology Stack: HTML, CSS, JavaScript

Prerequisites to Run Application: Docker, Cloned Git Repository

Instructions on how to run the application locally:
Open Terminal
Make sure you are in the components folder in the Happy Paws folder (if you are not, you need to navigate here to run docker)
Here, run docker compose up
Then, go to a browser, and search: localhost:3000
When you are finished running the application, uses docker compose down to stop running the application.


How to run the tests:
In the terminal, navigate to the components folder.
Then, type: vi docker-compose.yaml
Enter insert mode by hitting the key: i
Here, find where it says: command: 'npm run inanddev' 
Change this to: command: 'npm run testandrun'
Then, hit esc to exit insert mode
Finally, write and quit using :wq 
Then run docker compose up as normal, and the tests will run!
If you would like to run the application as normal, change the file docker-compose.yaml back to: command: 'npm run inanddev' 

Link to the deployed application: http://csci3308-110-1-demo.eastus.cloudapp.azure.com:3000/
