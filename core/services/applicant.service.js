var Applicants = require('../models/applicant');
var User = require('../models/user');
var config = require('../config').config();
var Role = require('../models/userRole');
var ApplicantComments = require('../models/applicantComment');
var ApplicantResumes = require('../models/applicantResume');
var ApplicantEducation = require('../models/applicantEducation');
var ApplicantEmployer = require('../models/applicantEmployer');
var ApplicantSocials = require('../models/applicantSocial');
var Socials = require('../models/social');
var Locations = require('../models/location');
var Skills = require('../models/skills');
var Users = require('../models/user');
var JobApplicant = require('../models/jobApplicant');
var JobPipeline = require('../models/jobPipeline');
var Jobs = require('../models/job');
var Histories = require('../models/history');
var emailService = require('../services/email.service');
var histroyService = require('../services/history.service');
let Company = require('../models/company');
exports.save = async (req, enableEmail) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (req.body.body) req.body = JSON.parse(req.body.body);
            if (req.body && (req.body.email || req.body._id)) {
                // Get email from body
                var email = Array.isArray(req.body.email) ? req.body.email.length > 0
                    ? req.body.email[0] : null : req.body.email;

                if (email) {
                    email = email.toLowerCase().trim();
                }
                // Get if applicant already exists
                var modelApplicant = null;
                if (req.body._id) {
                    modelApplicant = await Applicants.findById(req.body._id);
                } else if (email) {
                    modelApplicant = await Applicants.findOne({ email: email });
                }
                // Create applicant if unable to find
                if (modelApplicant == null) {
                    modelApplicant = new Applicants();
                    modelApplicant.created_by = req.user.id;
                    modelApplicant.created_at = new Date();
                }
                modelApplicant.email = email;
                modelApplicant.phones = modelApplicant.phone ? modelApplicant.phone : req.body.phone ? req.body.phone : [];
                modelApplicant.source = modelApplicant.source || req.body.source || "";
                modelApplicant.dob = req.body.dob ? new Date(req.body.dob) : modelApplicant.dob || "";
                modelApplicant.currentCtc = req.body.currentCtc || modelApplicant.currentCtc || '';
                modelApplicant.expectedCtc = req.body.expectedCtc || modelApplicant.expectedCtc || '';
                modelApplicant.noticePeriod = req.body.noticePeriod || modelApplicant.noticePeriod || '';
                modelApplicant.noticePeriodNegotiable = req.body.noticePeriodNegotiable || modelApplicant.noticePeriodNegotiable || '';
                modelApplicant.totalExperience = req.body.experience || modelApplicant.totalExperience || '';
                modelApplicant.availability = req.body.availability || modelApplicant.availability || '';
                modelApplicant.roles = req.body.roles || modelApplicant.roles || [];
                modelApplicant.referredBy = req.body.referredBy || null;
                if (req.body.firstName) {
                    modelApplicant.firstName = req.body.firstName ? req.body.firstName : '';
                    modelApplicant.middleName = req.body.middleName ? req.body.middleName : '';
                    modelApplicant.lastName = req.body.lastName ? req.body.lastName : '';
                } else if (req.body.name) {
                    modelApplicant.firstName = modelApplicant.firstName || getFirstName(req.body.name);
                    modelApplicant.middleName = modelApplicant.middleName || getMiddleName(req.body.name);
                    modelApplicant.lastName = modelApplicant.lastName || getLastName(req.body.name);
                } else {
                    // If nothing found
                    modelApplicant.firstName = email;
                }
                if (req.body.resume && req.body.resume.hasOwnProperty("id")) {
                    modelApplicant.resume = modelApplicant.resume || req.body.resume.id;
                    modelApplicant.source = modelApplicant.source || req.body.resume.source;
                }
                // Create/Update resume
                if (req.body.resumeId && req.body.resumeId.length > 0) {
                    modelApplicant.resume = req.body.resumeId;
                } else {
                    if (req.files && req.files.length > 0) {
                        modelResume = await ApplicantResumes.findById(modelApplicant.resume);
                        if (modelResume == null) {
                            modelResume = new ApplicantResumes();
                            modelResume.created_by = req.user.id;
                            modelResume.created_at = new Date();
                        }
                        modelResume.resume = req.files[0].buffer.toString('base64');
                        modelResume.fileName = req.body.resume && req.body.resume.file ? req.body.resume.file : req.files[0].originalname;
                        modelResume.fileType = req.files[0].mimetype;
                        modelResume.modified_by = req.user.id;
                        modelResume.modified_at = new Date();
                        modelResume = await modelResume.save();
                        modelApplicant.resume = modelResume._id;
                    } else {
                        modelApplicant.resume = req.body.resumeId;
                    }
                }

                // Create/Update skills
                if (req.body.skills) {
                    let skills;
                    if (Array.isArray(req.body.skills)) {
                        skills = req.body.skills;
                    } else {
                        skills = JSON.parse(req.body.skills);
                    }
                    let skillsResult = await findOrCreate(skills, req.user.id);
                    modelApplicant.skills = skillsResult;
                }

                // Create/Update Address
                var modelCurrentLocation = null;
                if (req.body.currentLocation) {
                    var current = JSON.parse(req.body.currentLocation);
                    if (current && current.length > 0) {
                        modelCurrentLocation = await Locations.findOne({ _id: current[0].id })
                        if (modelCurrentLocation == null) {
                            modelCurrentLocation = new Locations();
                            modelCurrentLocation.country = current.country || '';
                            modelCurrentLocation.city = current.city || '';
                            modelCurrentLocation.state = current.state || '';
                            modelCurrentLocation.zip = current.zip || '';
                            modelCurrentLocation.created_by = req.user.id;
                            modelCurrentLocation.created_at = new Date();
                            modelCurrentLocation.modified_by = req.user.id;
                            modelCurrentLocation.modified_at = new Date();
                            modelCurrentLocation = await modelCurrentLocation.save();
                        }
                        modelApplicant.location = modelCurrentLocation;
                    }
                } else {
                    modelApplicant.location = null;
                }

                var modelpreferredLocation = null;
                if (req.body.preferredLocation) {
                    var preferred = JSON.parse(req.body.preferredLocation);
                    if (preferred && preferred.length > 0) {
                        var preferredLocations = [];
                        for (let iPreferred = 0; iPreferred < preferred.length; iPreferred++) {
                            modelpreferredLocation = await Locations.findOne({ _id: preferred[iPreferred].id })
                            if (modelpreferredLocation == null) {
                                modelpreferredLocation = new Locations();
                                modelpreferredLocation.country = preferred[iPreferred].country || '';
                                modelpreferredLocation.city = preferred[iPreferred].city || '';
                                modelpreferredLocation.state = preferred[iPreferred].state || '';
                                modelpreferredLocation.zip = preferred[iPreferred].zip || '';
                                modelpreferredLocation.created_by = req.user.id;
                                modelpreferredLocation.created_at = new Date();
                                modelpreferredLocation.modified_by = req.user.id;
                                modelpreferredLocation.modified_at = new Date();
                                modelpreferredLocation = await modelpreferredLocation.save();
                            }
                            preferredLocations.push(modelpreferredLocation._id);
                        }
                        modelApplicant.preferredLocations = preferredLocations;
                    }
                }

                // Add Social Details
                if (req.body.socials && req.body.socials.length > 0) {
                    for (var iSocial = 0; iSocial < req.body.socials.length; iSocial++) {
                        var modelSocial = await Socials.findOne({ name: Socials[iSocial].name });
                        if (modelSocial == null) {
                            modelSocial = new Socials();
                            modelSocial.created_by = req.user.id;
                            modelSocial.created_at = new Date();
                            modelSocial.modified_by = req.user.id;
                            modelSocial.modified_at = new Date();
                            modelSocial.name = Socials[iSocial].name;
                            modelSocial = await modelSocial.save();
                        }
                        var applicantSocial = await ApplicantSocials.findOne({ social: modelSocial._id });
                        if (applicantSocial == null) {
                            applicantSocial = new ApplicantSocials();
                            applicantSocial.social = modelSocial._id;
                            applicantSocial.profileUrl = Socials[iSocial].profileUrl;
                            applicantSocial.created_by = req.user.id;
                            applicantSocial.created_at = new Date();
                            applicantSocial.modified_by = req.user.id;
                            applicantSocial.modified_at = new Date();
                            applicantSocial = await applicantSocial.save();
                        }
                        modelApplicant.socials.push(applicantSocial._id);
                    }
                }

                // Referral
                if (req.body.referralEmail) {
                    var modelUser = await Users.findOne({ email: req.body.referralEmail });
                    if (modelUser == null) {
                        modelUser.email = req.body.referralEmail.trim();
                        modelUser.created_by = req.user.id;
                        modelUser.created_at = new Date();
                        modelUser.modified_by = req.user.id;
                        modelUser.modified_at = new Date();
                        modelUser = await modelUser.save();
                    }
                    modelApplicant.referral = modelUser._id;
                }

                // Save profile in the end to ensure elastic searchis sycned
                modelApplicant.modified_by = req.user.id;
                modelApplicant.modified_at = new Date();
                modelApplicant = await modelApplicant.save();

                // if jobid and pipelinid available then add applicant to that job
                let jobPipeline = null;
                let modelJobApplicant = new JobApplicant();
                if (req.body.jobId) {
                    let modelJob = await Jobs.findById(req.body.jobId).populate('pipeline');
                    if (req.body.pipelineId) {
                        jobPipeline = await JobPipeline.findById({ _id: req.body.pipelineId, is_deleted: { $ne: true } });
                    } else {
                        jobPipeline = modelJob.pipelines ? modelJob.pipelines[0] : null;
                    }
                    if (jobPipeline == null) {
                        modelJobApplicant = new JobApplicant();
                    }
                    modelJobApplicant.job = modelJob.id;
                    modelJobApplicant.pipeline = jobPipeline;
                    modelJobApplicant.applicant = modelApplicant._id;
                    modelJobApplicant.is_deleted = false;
                    modelJobApplicant.created_at = new Date();
                    modelJobApplicant.created_by = req.user.id;
                    modelJobApplicant.modified_at = new Date();
                    modelJobApplicant.modified_by = req.user.id;
                    modelJobApplicant = await modelJobApplicant.save();
                    // Link with Job
                    if (modelJob.applicants == null) {
                        modelJob.applicants = [];
                    }
                    modelJob.applicants.push(modelJobApplicant._id);
                    modelJob = await modelJob.save();
                    modelJobApplicant.applicant = modelApplicant;

                    await histroyService.create({
                        applicant: modelApplicant._id,
                        pipeline: jobPipeline,
                        job: modelJob.id,
                        createdBy: req.user.id,
                        modifiedBy: req.user.id,
                    });
                } else {
                    console.log('job id is missing : ', req.body.jobId)
                }

                // Update HR and candidate
                if (enableEmail && modelApplicant.source && (modelApplicant.source === 'email' || modelApplicant.source === 'website')) {
                    var candidate = {
                        id: modelApplicant._id, name: req.body.name, email: email,
                        phone: req.body.phone, source: modelApplicant.source
                    };
                    notifyHR(candidate);
                    //await notifyCandidate(candidate);
                }

                try {
                    let candidate = {
                        id: modelApplicant._id, name: req.body.name, email: email,
                        phone: req.body.phone, source: modelApplicant.source
                    };
                    if (enableEmail && modelApplicant.email) {
                        await notifyCandidate(candidate);
                        console.log('email sent to : ', modelApplicant.email);
                    }
                } catch (error) {
                    console.log('send email error : ', error);
                }

                if (jobPipeline) {
                    resolve(modelJobApplicant);
                } else {
                    resolve(modelApplicant);
                }

            } else {
                console.log('save applicant : ', 'Email or Id is required');
                reject("Email or Id is required");
            }
        } catch (err) {
            console.log('save applicant catch : ', err);
            reject(err);
        }
    });
}

let skillObject = {};

async function findOrCreate(array, userId) {
    return new Promise(async (resolve, reject) => {
        try {
            let skills = [];
            for (var iSkill = 0; iSkill < array.length; iSkill++) {
                let name = array[iSkill].name ? array[iSkill].name : array[iSkill];
                if (name) {
                    if (skillObject && skillObject.hasOwnProperty(name)) {
                        skills.push(skillObject[name]._id);
                    } else {
                        let skill = await Skills.findOne({ name: name });
                        if (!skill && name) {
                            skill = new Skills();
                            skill.name = name.trim();
                            skill.is_deleted = false;
                            skill.created_by = userId;
                            skill.created_at = new Date();
                            skill.modified_by = userId;
                            skill.modified_at = new Date();
                            skill = await skill.save();
                        }
                        skillObject[name] = skill;
                        skills.push(skill._id);
                    }
                } else {
                    console.log('error in skill name : ', array[iSkill]);
                }
            }
            resolve(skills);
        } catch (error) {
            reject(error);
        }
    });
}

exports.resume = async (req) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (req.files && req.files.length > 0) {
                let modelResume = new ApplicantResumes();
                modelResume.created_by = req.user.id;
                modelResume.created_at = new Date();
                modelResume.resume = req.files[0].buffer.toString('base64');
                modelResume.fileName = req.body.resume && req.body.resume.file ? req.body.resume.file : req.files[0].originalname;
                modelResume.fileType = req.files[0].mimetype;
                modelResume.modified_by = req.user.id;
                modelResume.modified_at = new Date();
                modelResume = await modelResume.save();
                resolve({ id: modelResume._id });
            } else {
                reject({ status: 400, message: 'resume file is missing' });
            }
        } catch (error) {
            console.log('resume save error : ', error);
            reject({ status: 500, message: 'server error' });
        }
    });
}

exports.getById = async (_id) => {
    return (await Applicants.findById(_id).populate('location')
        .populate('preferredLocations').populate('resume', ["fileName", "fileType"])
        .populate({ path: 'skills', match: { is_deleted: { $ne: true } } }));
}

exports.getjobsByApplicantId = async (_id) => {
    return await JobApplicant.find({ applicant: _id, is_deleted: { $ne: true } }).populate({
        path: 'job',
        select: 'title skills',
        populate: {
            path: 'skills',
            select: 'name',
        }
    }).populate({ path: 'pipeline', select: 'name' });
}

exports.delete = async (_id) => {
    var modelApplicant = Applicants.findById(req.body._id);
    if (modelApplicant) {
        modelApplicant.is_deleted = true;
        modelApplicant.modified_by = req.user.id;
        modelApplicant = new Date();
        return await modelApplicant.save();
    }
    throw 'invalid id';
};

exports.addComment = async (req) => {
    let comment = {
        comment: req.body.comment,
        applicant: req.body.applicant,
        job: req.body.job,
        is_deleted: false,
        created_at: Date.now(),
        created_by: req.user.id,
        modified_at: Date.now(),
        modified_by: req.user.id
    }
    return await ApplicantComments.create(comment);
}

exports.updateCommentsById = async (req) => {
    let comment = {
        comment: req.body.comment,
        modified_at: Date.now(),
        modified_by: req.user.id
    }
    return await ApplicantComments.findByIdAndUpdate({ _id: req.body._id }, comment);
}

exports.getComments = async (req) => {
    return await ApplicantComments.find({ applicant: req.params.id, is_deleted: false }).populate({
        path: 'modified_by',
        select: 'email firstName lastName'
    });
}

exports.getCommentsByJob = async (applicantId, jobId) => {
    return ApplicantComments.find({ job: jobId, is_deleted: false }).populate({
        path: 'modified_by',
        select: 'email firstName lastName'
    });
}

exports.getApplicantHistory = async (applicantId,) => {
    return (await Histories.find({ applicant: applicantId, is_deleted: false })
        .populate({ path: 'job', select: 'title' })
        .populate({ path: 'pipeline', select: 'name' }));
}

getFirstName = (fullname) => {
    if (fullname && fullname.length > 0) {
        var nameParts = fullname.split(" ")
        if (nameParts.length > 0) {
            return nameParts[0];
        }
    }
    return '';
}

getMiddleName = (fullname) => {
    if (fullname && fullname.length > 0) {
        var nameParts = fullname.split(" ")
        if (nameParts.length == 3) {
            return nameParts[1];
        } else if (nameParts.length > 3) {
            var middleName = '';
            for (var index = 1; index < nameParts.length - 1; index++) {
                middleName += ' ' + nameParts[index]
            }
            return middleName.trim();
        }
    }
    return '';
}

getLastName = (fullname) => {
    if (fullname && fullname.length > 0) {
        var nameParts = fullname.split(" ")
        if (nameParts.length == 2) {
            return nameParts[1];
        } else if (nameParts.length > 2) {
            return nameParts[nameParts.length - 1];
        }
    }
    return '';
}

function notifyHR(candidate) {
    return new Promise(async (resolve, reject) => {
        // Get all HR (role = 2

        let hrRole = await Role.findOne({ name: "hr" });
        if (hrRole) {
            var hrTeam = await User.find({ is_deleted: false, roles: { $elemMatch: { $eq: hrRole } } });
            if (hrTeam && hrTeam.length > 0) {
                // Get list of hr emails
                var hrEmails = "";
                hrTeam.forEach(hr => {
                    hrEmails = hrEmails + hr.email + ","
                });

                var body = `
                <p>Dear HR,</p>
                <p>A new profile has been received </p>
                <p> <b>Candidate Name:</b>  ${candidate.name}<br>
               <b> Email:</b> ${candidate.email}<br>
               <b> Phone:</b> ${candidate.phone}<br>
               <b> Source:</b> ${candidate.source}</p>
                <p>Please click on below link to view details<p>
                <p>${config.website}/admin/applicants/${candidate.id}</p>
            `
                var email = {
                    toEmail: hrEmails, // list of receivers
                    subject: "New profile received", // Subject line
                    body: body,
                    title: "Resume received"
                }
                emailService.sendEmail(email, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            }
        }


    });
}

function notifyCandidate(candidate) {
    return new Promise(async (resolve, reject) => {
        let company = await getCompany();
        var body = `
                <p>Dear ${candidate.name},</p>
                <p>Thank you for applying for the job at ${company.name}. Your resume has been submitted successfully. </p>
                 <p>Our HR team will review your application and get back to you. </p>
                 <p>Please reach out to us in case of any query. Contact details are provided below.</p>
            `;
        var email = {
            toEmail: candidate.email, // list of receivers
            subject: "Resume submitted successfully", // Subject line
            body: body,
            title: ""
        };
        emailService.sendEmail(email, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

async function getCompany() {
    try {
        return await Company.findOne({});
    } catch (error) {
        console.log("getCompany--->", error);
        return config.companyInfo;
    }

};
