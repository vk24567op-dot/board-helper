const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();

/* =========================================
   PATHS
========================================= */

const BACKEND_DIR = __dirname;
const PROJECT_DIR = path.join(__dirname, "..");

const questionsPath = path.join(
    PROJECT_DIR,
    "database",
    "questions.json"
);

/*
 * Frontend index.html ke possible locations
 */
const rootIndexPath = path.join(
    PROJECT_DIR,
    "index.html"
);

const frontendIndexPath = path.join(
    PROJECT_DIR,
    "frontend",
    "index.html"
);


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


/* =========================================
   FRONTEND STATIC FILES
========================================= */

/*
 * Agar frontend folder me CSS / JS / images hain
 */
const frontendPath = path.join(
    PROJECT_DIR,
    "frontend"
);

if (fs.existsSync(frontendPath)) {

    app.use(
        express.static(frontendPath)
    );

}


/*
 * Root project ke static files
 *
 * Isse index.html ke saath
 * CSS / JS / images bhi serve ho sakte hain.
 */
app.use(
    express.static(PROJECT_DIR)
);


/* =========================================
   GET QUESTIONS FROM DATABASE
========================================= */

function getQuestions() {

    if (!fs.existsSync(questionsPath)) {

        throw new Error(
            "questions.json not found at: " +
            questionsPath
        );

    }

    const data = fs.readFileSync(
        questionsPath,
        "utf-8"
    );

    const questions = JSON.parse(data);

    if (!Array.isArray(questions)) {

        throw new Error(
            "questions.json must contain an array"
        );

    }

    return questions;
}


/* =========================================
   HEALTH CHECK
========================================= */

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        message:
            "Board Helper backend is running"

    });

});


/* =========================================
   FRONTEND / HOME PAGE
========================================= */

app.get("/", (req, res) => {

    /*
     * Pehle root index.html check
     */
    if (fs.existsSync(rootIndexPath)) {

        return res.sendFile(
            rootIndexPath
        );

    }


    /*
     * Agar frontend/index.html hai
     */
    if (fs.existsSync(frontendIndexPath)) {

        return res.sendFile(
            frontendIndexPath
        );

    }


    /*
     * Agar index.html nahi mila
     */
    return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Board Helper</title>
            <meta charset="UTF-8">
        </head>

        <body>

            <h1>Board Helper</h1>

            <p>
                Frontend index.html was not found.
            </p>

        </body>
        </html>
    `);

});


/* =========================================
   GET ALL QUESTIONS
========================================= */

app.get("/api/questions", (req, res) => {

    try {

        const questions =
            getQuestions();

        res.json({

            success: true,

            count:
                questions.length,

            questions:
                questions

        });

    } catch (error) {

        console.error(
            "Questions Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Questions database could not be loaded",

            error:
                error.message

        });

    }

});


/* =========================================
   SEARCH QUESTIONS
========================================= */

app.get("/api/search", (req, res) => {

    try {

        const questions =
            getQuestions();

        const subject =
            String(req.query.subject || "").trim();

        const chapter =
            String(req.query.chapter || "").trim();

        const concept =
            String(req.query.concept || "").trim();

        const year =
            String(req.query.year || "").trim();

        const marks =
            String(req.query.marks || "").trim();


        const results =
            questions.filter((q) => {

                /* =========================
                   SUBJECT
                ========================= */

                if (
                    subject &&
                    subject.toLowerCase() !==
                    String(q.subject || "")
                        .trim()
                        .toLowerCase()
                ) {

                    return false;

                }


                /* =========================
                   CHAPTER
                ========================= */

                if (
                    chapter &&
                    chapter.toLowerCase() !==
                    String(q.chapter || "")
                        .trim()
                        .toLowerCase()
                ) {

                    return false;

                }


                /* =========================
                   CONCEPT
                ========================= */

                if (
                    concept &&
                    !String(q.concept || "")
                        .toLowerCase()
                        .includes(
                            concept.toLowerCase()
                        )
                ) {

                    return false;

                }


                /* =========================
                   YEAR
                ========================= */

                if (
                    year &&
                    Number(q.year) !==
                    Number(year)
                ) {

                    return false;

                }


                /* =========================
                   MARKS
                ========================= */

                if (
                    marks &&
                    Number(q.marks) !==
                    Number(marks)
                ) {

                    return false;

                }


                return true;

            });


        res.json({

            success: true,

            count:
                results.length,

            questions:
                results

        });


    } catch (error) {

        console.error(
            "Search Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Search failed",

            error:
                error.message

        });

    }

});


/* =========================================
   SHUFFLE ARRAY
========================================= */

function shuffleArray(array) {

    const arr = [
        ...array
    ];

    for (
        let i = arr.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            arr[i],
            arr[j]
        ] = [
            arr[j],
            arr[i]
        ];

    }

    return arr;

}


/* =========================================
   EXTRACT MCQ OPTIONS
========================================= */

function extractMCQ(questionText) {

    const text =
        String(questionText || "")
            .trim();


    /*
     * Supported:
     *
     * (a) Option 1
     * (b) Option 2
     * (c) Option 3
     * (d) Option 4
     */

    const optionRegex =
        /\(([a-dA-D])\)\s*([\s\S]*?)(?=\s*\([a-dA-D]\)\s*|$)/g;


    const options = [];

    let match;


    while (
        (match =
            optionRegex.exec(text)) !== null
    ) {

        options.push({

            letter:
                match[1].toLowerCase(),

            text:
                match[2].trim()

        });

    }


    /*
     * Exactly 4 options hone chahiye
     */

    if (options.length !== 4) {

        return null;

    }


    /*
     * First option se pehle wala part
     * actual question hai
     */

    const firstOptionIndex =
        text.search(
            /\([a-dA-D]\)\s*/
        );


    if (
        firstOptionIndex === -1
    ) {

        return null;

    }


    const cleanQuestion =
        text
            .substring(
                0,
                firstOptionIndex
            )
            .trim();


    if (!cleanQuestion) {

        return null;

    }


    return {

        question:
            cleanQuestion,

        options:
            options

    };

}


/* =========================================
   FIND CORRECT ANSWER
========================================= */

function findCorrectOption(
    solution,
    options
) {

    const solutionText =
        String(solution || "")
            .trim();


    if (
        !solutionText ||
        !options ||
        options.length !== 4
    ) {

        return null;

    }


    /* =========================
       OPTION LETTER FIND
    ========================= */

    const letterPatterns = [

        /correct\s+option\s*[:\-]?\s*\(?([a-d])\)?/i,

        /correct\s+answer\s*[:\-]?\s*\(?([a-d])\)?/i,

        /answer\s*[:\-]?\s*\(?([a-d])\)?/i,

        /^\s*\(?([a-d])\)?(?:\s|$)/i,

        /\(([a-d])\)/i

    ];


    for (
        const pattern of letterPatterns
    ) {

        const match =
            solutionText.match(
                pattern
            );


        if (match) {

            const correctLetter =
                match[1].toLowerCase();


            const correctOption =
                options.find(
                    option =>
                        option.letter ===
                        correctLetter
                );


            if (correctOption) {

                return {

                    letter:
                        correctLetter,

                    text:
                        correctOption.text

                };

            }

        }

    }


    /* =========================
       DIRECT ANSWER TEXT
    ========================= */

    let cleanSolution =
        solutionText
            .replace(
                /^.*?(correct\s+answer|correct\s+option|answer)\s*[:\-]?\s*/i,
                ""
            )
            .trim();


    /*
     * Agar solution ke beginning/end
     * me (b) etc. ho to remove karo
     */

    cleanSolution =
        cleanSolution
            .replace(
                /^\(([a-d])\)\s*/i,
                ""
            )
            .trim();


    const directAnswer =
        options.find(
            option =>
                option.text
                    .trim()
                    .toLowerCase() ===
                cleanSolution
                    .trim()
                    .toLowerCase()
        );


    if (directAnswer) {

        return {

            letter:
                directAnswer.letter,

            text:
                directAnswer.text

        };

    }


    return null;

}


/* =========================================
   PRACTICE MODE API
========================================= */

app.post(
    "/api/practice",
    (req, res) => {

        try {

            const questions =
                getQuestions();


            const subject =
                String(
                    req.body.subject || ""
                ).trim();


            const chapter =
                String(
                    req.body.chapter || ""
                ).trim();


            /*
             * Subject + Chapter required
             */

            if (
                !subject ||
                !chapter
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Subject and chapter are required"

                });

            }


            /* =========================
               FILTER QUESTIONS
            ========================= */

            const filtered =
                questions.filter(
                    (q) => {

                        const subjectMatch =
                            String(
                                q.subject || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            subject
                                .toLowerCase();


                        const chapterMatch =
                            String(
                                q.chapter || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            chapter
                                .toLowerCase();


                        return (
                            subjectMatch &&
                            chapterMatch
                        );

                    }
                );


            const mcqQuestions = [];


            /* =========================
               CONVERT QUESTIONS TO MCQ
            ========================= */

            filtered.forEach(
                (q) => {

                    const extracted =
                        extractMCQ(
                            q.question
                        );


                    /*
                     * MCQ nahi hai
                     */

                    if (!extracted) {

                        return;

                    }


                    /*
                     * Correct answer find karo
                     */

                    const correctOption =
                        findCorrectOption(
                            q.solution,
                            extracted.options
                        );


                    /*
                     * Correct answer nahi mila
                     */

                    if (!correctOption) {

                        return;

                    }


                    /*
                     * Options ko shuffle karo
                     *
                     * IMPORTANT:
                     * correct answer ka TEXT
                     * save rahega.
                     */

                    const shuffledOptions =
                        shuffleArray(
                            extracted.options
                        );


                    /*
                     * Frontend ko sirf strings
                     * bhejenge.
                     */

                    const finalOptions =
                        shuffledOptions.map(
                            option =>
                                option.text
                        );


                    mcqQuestions.push({

                        question:
                            extracted.question,

                        options:
                            finalOptions,

                        answer:
                            correctOption.text

                    });

                }
            );


            /* =========================
               QUESTION ORDER RANDOM
            ========================= */

            const finalQuestions =
                shuffleArray(
                    mcqQuestions
                );


            /* =========================
               RESPONSE
            ========================= */

            res.json({

                success: true,

                count:
                    finalQuestions.length,

                questions:
                    finalQuestions

            });

        } catch (error) {

            console.error(
                "Practice Mode Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Practice questions could not be loaded",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   404 API HANDLER
========================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found"

        });

    }
);


/* =========================================
   FRONTEND FALLBACK
========================================= */

/*
 * Browser agar koi frontend route open kare
 * to index.html serve hoga.
 *
 * API routes isse pehle handle ho chuke hain.
 */

app.get(
    /.*/,
    (req, res) => {

        if (fs.existsSync(rootIndexPath)) {
            return res.sendFile(rootIndexPath);
        }

        if (fs.existsSync(frontendIndexPath)) {
            return res.sendFile(frontendIndexPath);
        }

        res.status(404).send(
            "Board Helper frontend not found"
        );
    }
);


/* =========================================
   ERROR HANDLER
========================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Server Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Internal server error"

        });

    }
);


/* =========================================
   START SERVER
========================================= */

const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================="
        );

        console.log(
            "Board Helper server is running"
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Questions: ${questionsPath}`
        );

        console.log(
            `Root Index: ${rootIndexPath}`
        );

        console.log(
            `Frontend Index: ${frontendIndexPath}`
        );

        console.log(
            "================================="
        );

    }
);