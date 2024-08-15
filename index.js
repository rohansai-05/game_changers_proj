const express = require('express');
const path = require('path');
const nodemailer = require("nodemailer");

const bodyParser = require('body-parser');
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

const port = 3000;

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

var serviceAccount = require("./key.json");

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

// Use body-parser to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("main");
});

app.get("/signin", (req, res) => {
    res.render("signin");
});

app.post("/signinsubmit", (req, res) => {
    const email_id = req.body.email_id;  // Use req.body to access POST data
    const password = req.body.password;  // Use req.body to access POST data

    db.collection('dolphin').where("email", "==", email_id).where("password", "==", password).get()
        .then((docs) => {
            if (docs.size > 0) {
                const user = docs.docs[0].data();
                const full_name = user.full_name;
                res.render("aft_login", { full_name: full_name, email: email_id });
            } else {
                res.send("wrong credentials");
            }
        })
        .catch((error) => {
            console.error("Error retrieving user data: ", error);
            res.status(500).send("Internal Server Error");
        });
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signupsubmit", (req, res) => {
    const full_name = req.body.full_name;
    const last_name = req.body.last_name;
    const email_id = req.body.email_id;
    const password = req.body.password;

    const usersRef = db.collection('dolphin');

    usersRef.where('email', '==', email_id).get()
        .then(snapshot => {
            if (!snapshot.empty) {
                return res.redirect('/signup?error=email_exists');
            } else {
                return usersRef.where('password', '==', password).get();
            }
        })
        .then(snapshot => {
            if (snapshot && !snapshot.empty) {
                return res.redirect('/signup?error=password_exists');
            } else {
                return usersRef.add({
                    full_name: full_name + ' ' + last_name,
                    email: email_id,
                    password: password,
                });
            }
        })
        .then(() => {
            res.render("aft_login", { full_name: full_name, email: email_id });
        })
        .catch(error => {
            console.error("Error checking existing users or adding new user: ", error);
            res.status(500).send("Internal Server Error");
        });
});

app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/images', express.static(path.join(__dirname, 'images')));


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'rohansaigonna@gmail.com',
        pass: 'gxaa yhwe buun vqhw'
    }
});

function sendRegistrationEmail(email, name, course) {
    const mailOptions = {
        from: 'rohansaigonna05@gmail.com',
        to: email,
        subject: 'Course Registration Confirmation',
        text: `Hello ${name},\n\nYou have successfully registered for the course: ${course}.\n\nThank you!`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending registration email:', error);
        } else {
            console.log('Registration email sent:', info.response);
        }
    });
}
function sendUnregistrationEmail(email, name, course) {
    const mailOptions = {
        from: '22pa1a4541@vishnu.edu.in',
        to: email,
        subject: 'Course Unregistration Confirmation',
        text: `Hello ${name},\n\nYou have successfully unregistered from the course: ${course}.\n\nThank you!`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending unregistration email:', error);
        } else {
            console.log('Unregistration email sent:', info.response);
        }
    });
}

// Register endpoint
// Register endpoint
// Register endpoint
app.get("/register", (req, res) => {
    const courseName = req.query.course;
    const email = req.query.email;
    const name = req.query.name;

    // Check if the user is already registered for the course
    db.collection('registrations')
        .where('email', '==', email)
        .where('course', '==', courseName)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const registration = snapshot.docs[0].data();
                if (registration.status === 'registered') {
                    return res.json({ success: false, message: 'Already registered' });
                } else {
                    // Update the registration status to 'registered'
                    const docId = snapshot.docs[0].id;
                    return db.collection('registrations').doc(docId).update({
                        status: 'registered'
                    });
                }
            } else {
                // Add a new registration entry
                return db.collection('registrations').add({
                    email: email,
                    name: name,
                    course: courseName,
                    status: 'registered'
                });
            }
        })
        .then(() => {
            // Add or update progress in userProgress collection
            return db.collection('userProgress').doc(`${email}_${courseName}`).set({
                email: email,
                course: courseName,
                progress: 0 // Initial progress percentage
            }, { merge: true });
        })
        .then(() => {
            // Send registration email
            sendRegistrationEmail(email, name, courseName);
            
            // Send registration success response
            res.json({ success: true });
        })
        .catch(error => {
            console.error("Error registering course: ", error);
            res.json({ success: false });
        });
});



// Unregister endpoint
app.get("/unregister", (req, res) => {
    const courseName = req.query.course;
    const email = req.query.email;

    db.collection('registrations')
        .where('email', '==', email)
        .where('course', '==', courseName)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                return res.json({ success: false, message: 'Not registered for this course' });
            } else {
                const docId = snapshot.docs[0].id;
                return db.collection('registrations').doc(docId).update({
                    status: 'unregistered'
                }).then(() => {
                    return db.collection('registrations').doc(docId).get();
                });
            }
        })
        .then(doc => {
            if (doc) {
                const name = doc.data().name; // Get the name from the document data
                sendUnregistrationEmail(email, name, courseName);
            }
            res.json({ success: true });
        })
        .catch(error => {
            console.error("Error unregistering course: ", error);
            res.json({ success: false });
        });
});




app.get("/fetch-registered-courses", (req, res) => {
    const email = req.query.email;

    db.collection('registrations')
        .where('email', '==', email)
        .where('status', '==', 'registered')
        .get()
        .then(snapshot => {
            const courses = [];
            snapshot.forEach(doc => {
                courses.push(doc.data().course);
            });
            res.json({ courses: courses });
        })
        .catch(error => {
            console.error("Error fetching registered courses: ", error);
            res.json({ courses: [] });
        });
});

app.get("/check-registration", (req, res) => {
    const courseName = req.query.course;
    const email = req.query.email;

    db.collection('registrations')
        .where('email', '==', email)
        .where('course', '==', courseName)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const registration = snapshot.docs[0].data();
                res.json({ registered: true, status: registration.status });
            } else {
                res.json({ registered: false });
            }
        })
        .catch(error => {
            console.error("Error checking registration: ", error);
            res.status(500).json({ registered: false });
        });
});

// Main page route
app.get('/main_1', (req, res) => {
    const courseName = req.query.course;
    const email = req.query.email;
    const fullName = req.query.name;

    // Fetch user's progress for the selected course
    db.collection('userProgress').doc(`${fullName}_${courseName}`).get()
        .then(doc => {
            let progress = 0; // Default progress if not found
            if (doc.exists) {
                progress = doc.data().progress;
            }
            res.render('main_1', { email, course: courseName, full_name: fullName, progress });
        })
        .catch(error => {
            console.error("Error fetching user's progress: ", error);
            // Render the page with default progress if an error occurs
            res.render('main_1', { email, course: courseName, full_name: fullName, progress: 0 });
        });
});

// Function to update progress in userProgress collection
function updateProgress(fullName, courseName, newProgress) {
    return db.collection('userProgress').doc(`${fullName}_${courseName}`).set({
        progress: newProgress
    }, { merge: true });
}

// Complete button click handler
app.post('/complete-continue-btn', (req, res) => {
    const courseName = req.body.course;
    const email = req.body.email;
    const fullName = req.body.full_name;
    const currentProgress = parseInt(req.body.progress);

    // Calculate new progress (for example, increment by 20%)
    const newProgress = currentProgress + 20;

    // Update progress in userProgress collection
    updateProgress(fullName, courseName, newProgress)
        .then(() => {
            // Redirect back to main_1 page with updated progress
            res.redirect(`/main_1?course=${courseName}&email=${email}&name=${encodeURIComponent(fullName)}`);
        })
        .catch(error => {
            console.error("Error updating progress: ", error);
            // Redirect back to main_1 page with default progress if an error occurs
            res.redirect(`/main_1?course=${courseName}&email=${email}&name=${encodeURIComponent(fullName)}`);
        });
});
