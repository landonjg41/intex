const express = require("express");

let app = express();

let path = require("path");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.urlencoded({extended : true}));
app.use(express.static(path.join(__dirname, '/assets'))); //should connect all css files within assets subdirectory

//connection to pgadmin
const knex = require("knex")({
    client: 'pg',
    connection : {
        host: process.env.RDS_HOSTNAME || 'localhost',
        user: process.env.RDS_USERNAME || 'postgres',
        password: process.env.RDS_PASSWORD || 'admin',
        database: process.env.RDS_DB_NAME || 'intex-double',
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

//check if successful connection to database
knex.raw('SELECT 1+1 as result')
  .then(() => {
    console.log('Database connection successful.');
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error);
  })
  .finally(() => {
    console.log('does this do anything at all');
  });

//home page
app.get("/", (req, res) => {
    res.render("landingPage");
});


//get for login page
app.get("/loginPage", (req, res) => {
  knex.select().from('profile_info').then(object => {
    res.render("loginPage", { object: object });
  }).catch(err => {
    console.log(err);
    res.status(500).json({ err });
  });
});

// Handle form submission for login with POST requests
app.post("/loginPage", async (req, res) => {
  const loginUsername = req.body.username;
  const loginPassword = req.body.password;

  try {
    const user = await knex("profile_info").select('*').where({ username: loginUsername }).first();

    if (!user) {
      // No username found
      res.render('loginPage', { error: 'Username not found' });
      console.log('No username found');
      return;
    }

    if (user.password !== loginPassword) {
      // Incorrect password
      res.render('loginPage', { error: 'Incorrect password' });
      console.log('Incorrect password');
      return;
    }

    // Successful login, redirect to the /postLogin page
    res.redirect(`/postLogin?username=${loginUsername}`);
    console.log('Login successful, redirecting to /postLogin');
  } catch (err) {
    // Handle any database error
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



//directs us to create account page
app.get("/createAccount", (req, res) => {
  res.render("createAccount");
  console.log('createAccount rendered');
}); 


//create account post
app.post('/createAccount', (req, res) => {
  const { username, password } = req.body;

  // Check if the username already exists
  knex('profile_info')
      .insert({
        username: username,
        password: password,
      })
      .then(() => {
        res.redirect("/");
      })
      .catch((err) => {
        // Username already exists, redirect back to registration with a query parameter
        console.error(err);
        res.send('<script> alert("Username already in use. Please choose another one");window.location.href = "/createAccount";</script>'
        );
      });
});


//create routes to remaining pages

//survey route get
app.get("/surveyPage", (req, res) => {
  console.log("surveyPage rendered");
  res.render("surveyPage");
});

 // Get request for dashboard page
 app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

//survey post
app.post("/surveyPage", async (req, res) => {
  const currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = String(currentDate.getMonth() + 1).padStart(2, '0');
  let day = String(currentDate.getDate()).padStart(2, '0');
  let hours = String(currentDate.getHours()).padStart(2, '0');
  let minutes = String(currentDate.getMinutes()).padStart(2, '0');
  let seconds = String(currentDate.getSeconds()).padStart(2, '0');
  let currentTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  const age = parseInt(req.body.age, 10); // Parse age as an integer
  const validGenders = ['Male', 'Female', 'Trans', 'Nonbinary', 'Unsure'];
  const gender = req.body.gender.toString();
  if (isNaN(age) || age < 0 || !validGenders.includes(gender)) {
    // Handle invalid input (e.g., send an error response)
    return res.status(400).send('Invalid age or gender');
  }
  console.log('Current Time:', currentTime);
  console.log('Age:', age);
  console.log('Gender:', gender);
try{
    const [surveyResponse] = await knex("survey_response")
              .insert({
                  Origin: 'Provo',
                  Timestamp: currentTime,
                  Age: age,
                  Gender: gender,
                   RelationshipStatus: req.body.relationshipStatus,
                   OccupationStatus: req.body.occupationStatus,
                   SocialMediaUse: req.body.useSocialMedia === 'Yes' ? 'Yes' : 'No',
                   AverageTime: req.body.dailySocialMediaTime,
                   SM_WithoutPurpose: req.body.socialMediaPurpose,
                   SM_Distracted: req.body.socialMediaDistraction,
                   SM_Restless: req.body.socialMediaRestless,
                   SM_Comparison: req.body.socialMediaComparisons,
                   SM_ComparisonFeeling: req.body.comparisonFeelings,
                   SM_Validation: req.body.validationSeeking,
                   MH_Distracted: req.body.distractibility,
                   MH_Worries: req.body.worries,
                   MH_Concentration: req.body.concentrationDifficulty,
                   MH_Depression: req.body.depressionFrequency,
                   MH_ActivityInterest: req.body.interestFluctuation,
                   MH_Sleep: req.body.sleepIssues,
                   SocialMediaScore: (parseInt(req.body.socialMediaDistraction) + parseInt(req.body.socialMediaPurpose) + parseInt(req.body.socialMediaRestless) + parseInt(req.body.socialMediaComparisons) + parseInt(req.body.comparisonFeelings) + parseInt(req.body.validationSeeking)),// Your calculation here,
                   MentalHealthSeverityScore: (parseInt(req.body.distractibility) + parseInt(req.body.worries) + parseInt(req.body.concentrationDifficulty) + parseInt(req.body.depressionFrequency) + parseInt(req.body.interestFluctuation) + parseInt(req.body.sleepIssues)),// Your calculation here,

              })
              .returning(['Timestamp','Age','Gender']);
              console.log('Survey Response:', surveyResponse);
              
      // Handle the social media and organization responses
      const orgTypeToIdMap = {
        'Private': 1,
        'School': 2,
        'University': 3,
        'Company': 4,
        'Government':5
      }
      for (const orgType of req.body.affiliatedOrganizations) {
          const orgId = orgTypeToIdMap[orgType];
          await knex('organization_survey_response').insert({
              //organization_responseId: surveyResponseId,
              Timestamp: surveyResponse.Timestamp, // or knex.fn.now() for current timestamp
              Age: req.body.age,
              Gender: req.body.gender,
              OrgID: orgId // Assuming the value of each checkbox corresponds to an orgID in the 'organization' table
          });
      }
      const socialTypeToIdMap = {
        'Facebook':1,
        'Twitter':2,
        'Instagram':3,
        'Youtube':4,
        'Discord': 5,
        'Reddit':6,
        'TikTok':7,
        'Pinterest':8,
        'Snapchat':9
      }
      console.log("entering the social media platforms");
      for (const platform of req.body.socialMediaPlatforms) {
          const platformId = socialTypeToIdMap[platform];
          await knex('social_media_survey_response').insert({
              Timestamp: surveyResponse.Timestamp, // or knex.fn.now() for current timestamp
              Age: req.body.age,
              Gender: req.body.gender,
              SocialMediaID: platformId // Assuming the value of each checkbox corresponds to a social_mediaID in the 'social_media' table
          });
      }
      // Send a success response or redirect
      res.redirect("/");
      // or res.redirect('/some-success-page');
  } catch (error) {
      console.error('Error saving survey response:', error);
      res.status(500).send('Failed to save survey response.');
  }
});

//survey datat get
app.get('/surveyData', async (req, res) => {
  try {
    // Fetch all survey data
    const allSurveyData = await knex
      .select(
        'sr.Timestamp',
        'sr.Age',
        'sr.Gender',
        'sr.Origin',
        'sr.RelationshipStatus',
        'sr.OccupationStatus',
        'sr.SocialMediaUse',
        'sr.MentalHealthSeverityScore',
        'sr.SocialMediaScore',
        'sr.AverageTime',
        'sm.SocialMediaType',
        'org.OrgType',
        'sr.SM_WithoutPurpose',
        'sr.SM_Distracted',
        'sr.SM_Restless',
        'sr.MH_Distracted',
        'sr.MH_Worries',
        'sr.MH_Concentration',
        'sr.SM_Comparison',
        'sr.SM_ComparisonFeeling',
        'sr.SM_Validation',
        'sr.MH_Depression',
        'sr.MH_ActivityInterest',
        'sr.MH_Sleep'
      )
      .from('survey_response as sr')
      .join(
        'social_media_survey_response as smsr',
        'sr.Timestamp',
        '=',
        'smsr.Timestamp'
      )
      .join('social_media as sm', 'smsr.SocialMediaID', '=', 'sm.SocialMediaID')
      .join(
        'organization_survey_response as osr',
        'sr.Timestamp',
        '=',
        'osr.Timestamp'
      )
      .join('organization as org', 'osr.OrgID', '=', 'org.OrgID');

    // Fetch distinct primary keys for the dropdown
    const distinctSurveyKeys = await knex
      .distinct('Timestamp', 'Age', 'Gender')
      .select()
      .from('survey_response');

    // Render the EJS file with both the dropdown and the table
    res.render('surveyData', {
      surveyData: allSurveyData,
      distinctSurveyKeys,
    });
  } catch (error) {
    console.error('Error fetching survey data:', error);
    res.status(500).send('Internal Server Error');
  }
});

//get post login
app.get("/postLogin", (req, res) => {
    const username = req.query.username;
  // Render the postLogin page and pass the username variable
  res.render("postLogin", { username });
});

//createAccount GET
app.get('/createAccount', (req, res) => {
  res.render('createAccount'); 
});

//surveyData GET
app.get('/surveyData', (req, res) => {
  res.render('surveyData'); 
});



// Assuming you have a function to fetch user data from the database
async function getUserByUsername(username) {
  try {
    const user = await knex('profile_info').where({ username }).first();
    return user;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}



// editProfile route
app.get('/editProfile', async (req, res) => {
  try {
    // Fetch the current user information from the database using the request parameter
    const username = req.query.username; // Assuming the username is passed as a query parameter

    // Check if the username is provided in the query parameter
    if (!username) {
      return res.status(400).send('Username is required');
    }

    // Fetch user data based on the provided username
    const user = await getUserByUsername(username);

    // Render the editProfile page with the user data
    res.render('editProfile', { user });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle the form submission to update the password
app.post("/editProfile", async (req, res) => {
  const username = req.body.username;
  const newPassword = req.body.password;

  try {
    // Update the password in the profile_info table
    await knex("profile_info").where({ username }).update({ password: newPassword });

    // Redirect to a success page or the updated profile page
    res.redirect("/editProfile?username=" + username);
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(port, () => console.log("Website is on like donkey-kong"));