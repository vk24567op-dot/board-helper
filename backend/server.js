const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

const questionsPath = path.join(
    __dirname,
    "database",
    "questions.json"
);


/* =========================================
   GET QUESTIONS FROM DATABASE
========================================= */

function getQuestions() {

    const data = fs.readFileSync(
        questionsPath,
        "utf-8"
    );

    return JSON.parse(data);
}


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());
app.use(express.json());


/* =========================================
   HEALTH CHECK
========================================= */

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Board Helper backend is running"
    });

});


/* =========================================
   GET ALL QUESTIONS
========================================= */

app.get("/api/questions", (req, res) => {

    try {

        const questions = getQuestions();

        res.json({
            success: true,
            count: questions.length,
            questions: questions
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Questions database could not be loaded"
        });

    }

});


/* =========================================
   SEARCH QUESTIONS
========================================= */

app.get("/api/search", (req, res) => {

    try {

        const questions = getQuestions();

        const subject = req.query.subject;
        const chapter = req.query.chapter;
        const concept = req.query.concept;
        const year = req.query.year;
        const marks = req.query.marks;


        const results = questions.filter((q) => {


            /* SUBJECT */

            if (
                subject &&
                String(q.subject || "")
                    .trim()
                    .toLowerCase() !==
                String(subject)
                    .trim()
                    .toLowerCase()
            ) {

                return false;

            }


            /* CHAPTER */

            if (
                chapter &&
                String(q.chapter || "")
                    .trim()
                    .toLowerCase() !==
                String(chapter)
                    .trim()
                    .toLowerCase()
            ) {

                return false;

            }


            /* CONCEPT */

            if (
                concept &&
                !String(q.concept || "")
                    .toLowerCase()
                    .includes(
                        String(concept).toLowerCase()
                    )
            ) {

                return false;

            }


            /* YEAR */

            if (
                year &&
                Number(q.year) !== Number(year)
            ) {

                return false;

            }


            /* MARKS */

            if (
                marks &&
                Number(q.marks) !== Number(marks)
            ) {

                return false;

            }


            return true;

        });


        res.json({

            success: true,
            count: results.length,
            questions: results

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Search failed"

        });

    }

});


/* =========================================
   SHUFFLE ARRAY
========================================= */

function shuffleArray(array) {

    const arr = [...array];

    for (
        let i = arr.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
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
   EXTRACT MCQ OPTIONS FROM QUESTION
========================================= */

function extractMCQ(questionText) {

    const text = String(
        questionText || ""
    ).trim();


    /*
       Example:

       From which country did Garibaldi belong?
       (a) Austria
       (b) Italy
       (c) Greece
       (d) Spain
    */


    const optionRegex =
        /\(([a-dA-D])\)\s*([\s\S]*?)(?=\s*\([a-dA-D]\)\s*|$)/g;


    const options = [];

    let match;


    while (
        (match = optionRegex.exec(text)) !== null
    ) {

        options.push({

            letter:
                match[1].toLowerCase(),

            text:
                match[2].trim()

        });

    }


    /*
       Agar 4 options nahi hain
       to MCQ nahi maana jayega
    */

    if (options.length < 4) {

        return null;

    }


    /*
       Question ke andar se
       options remove karna
    */

    const cleanQuestion =
        text
            .replace(
                /\s*\([a-dA-D]\)\s*[\s\S]*$/,
                ""
            )
            .trim();


    return {

        question: cleanQuestion,

        options: options

    };

}


/* =========================================
   FIND CORRECT ANSWER FROM SOLUTION
========================================= */

function findCorrectOption(
    solution,
    options
) {

    const solutionText =
        String(solution || "").trim();


    if (!solutionText) {

        return null;

    }


    /*
       Ye formats support karega:

       (a)
       (b)
       Correct option: (b)
       Correct Answer: (b)
       Answer: (b)
    */

    const letterMatch =
        solutionText.match(
            /\(([a-dA-D])\)/i
        );


    if (letterMatch) {

        const correctLetter =
            letterMatch[1].toLowerCase();


        const correctOption =
            options.find(
                option =>
                    option.letter ===
                    correctLetter
            );


        if (correctOption) {

            return {

                text: correctOption.text,

                letter: correctLetter

            };

        }

    }


    /*
       Agar solution mein
       direct answer text diya hai

       Example:
       Answer: Italy
    */

    const cleanSolution =
        solutionText
            .replace(
                /^.*?(answer|correct answer|correct option)\s*[:\-]?\s*/i,
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

            text: directAnswer.text,

            letter: directAnswer.letter

        };

    }


    return null;

}


/* =========================================
   PRACTICE MODE API
========================================= */

app.post("/api/practice", (req, res) => {
    try {

        const questions = getQuestions();

        const subject = req.body.subject;
        const chapter = req.body.chapter;

        if (!subject || !chapter) {
            return res.status(400).json({
                success: false,
                message: "Subject and chapter are required"
            });
        }

        const filtered = questions.filter((q) => {

            const subjectMatch =
                String(q.subject || "").trim().toLowerCase() ===
                String(subject || "").trim().toLowerCase();

            const chapterMatch =
                String(q.chapter || "").trim().toLowerCase() ===
                String(chapter || "").trim().toLowerCase();

            return subjectMatch && chapterMatch;
        });

        const mcqQuestions = [];

        filtered.forEach((q) => {

            const questionText = String(q.question || "");

            /*
             * OPTIONS FIND
             *
             * Example:
             * (a) Austria
             * (b) Italy
             * (c) Greece
             * (d) Spain
             */

            const optionRegex =
                /\(([a-dA-D])\)\s*([\s\S]*?)(?=\s*\([a-dA-D]\)\s*|$)/g;

            const options = [];

            let match;

            while ((match = optionRegex.exec(questionText)) !== null) {

                options.push({
                    letter: match[1].toLowerCase(),
                    text: match[2].trim()
                });

            }

            /*
             * 4 OPTIONS REQUIRED
             */

            if (options.length !== 4) {
                return;
            }

            /*
             * QUESTION SEPARATE KARO
             */

            const firstOptionIndex =
                questionText.search(/\([a-dA-D]\)\s*/);

            if (firstOptionIndex === -1) {
                return;
            }

            const cleanQuestion =
                questionText
                    .substring(0, firstOptionIndex)
                    .trim();

            /*
             * CORRECT ANSWER FIND KARO
             *
             * Solution examples:
             * (b) Italy
             * Correct option: (B)
             * Answer: (b)
             */

            const solution =
                String(q.solution || "");

            const answerMatch =
                solution.match(
                    /(?:correct\s+option|answer)?\s*:?\s*\(?([a-dA-D])\)?/i
                );

            if (!answerMatch) {
                return;
            }

            const correctLetter =
                answerMatch[1].toLowerCase();

            const correctOption =
                options.find(
                    option =>
                        option.letter === correctLetter
                );

            if (!correctOption) {
                return;
            }

            /*
             * OPTIONS RANDOM
             */

            for (
                let i = options.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(Math.random() * (i + 1));

                [
                    options[i],
                    options[j]
                ] = [
                    options[j],
                    options[i]
                ];
            }

            /*
             * IMPORTANT:
             * FRONTEND KO STRING OPTIONS BHEJENGE
             *
             * Isse [object Object] nahi aayega.
             */

            const finalOptions =
                options.map(option => option.text);

            /*
             * Correct answer ka text
             */

            mcqQuestions.push({
                question: cleanQuestion,
                options: finalOptions,
                answer: correctOption.text
            });

        });

        /*
         * QUESTIONS RANDOM ORDER
         */

        for (
            let i = mcqQuestions.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(Math.random() * (i + 1));

            [
                mcqQuestions[i],
                mcqQuestions[j]
            ] = [
                mcqQuestions[j],
                mcqQuestions[i]
            ];
        }

        res.json({
            success: true,
            count: mcqQuestions.length,
            questions: mcqQuestions
        });

    } catch (error) {

        console.error("Practice Mode Error:", error);

        res.status(500).json({
            success: false,
            message: "Practice questions could not be loaded"
        });

    }
});

const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Board Helper backend running on port ${PORT}`
        );
    }
);