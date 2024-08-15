const nodemailer=require("nodemailer");
require("dotenv").config();
const path=require('path'); 

const transporter = nodemailer.createTransport({
    service:'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.USER,
      pass: process.env.APP_PASSWORD,
    },
  });

  const mailoptions={
    from: {
        name:"rohan sai",
        address: process.env.USER
    },
    to: "rohansaigonna@gmail.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>" // html body
    
  }

  const sendMail =async (transporter,mailoptions) => {
    try{
        await transporter.sendMail(mailoptions);
        console.log("sent");
    }catch(error){
        console.error(error);
    }
  }

  sendMail(transporter,mailoptions);