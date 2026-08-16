const express = require("express");
const router = express.Router();

const CodeReview = require("../models/CodeReview");
const authMiddleware = require("../middleware/authMiddleware");

function addUnique(items, message) {
    if (!items.includes(message)) {
        items.push(message);
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Removes comments and quoted text before applying structural checks. Newlines are
// retained so line-oriented expressions continue to work predictably.
function codeOnly(source, language) {
    let result = source.replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
        (match) => match.replace(/[^\r\n]/g, " ")
    );

    if (language === "python") {
        result = result.replace(/#[^\r\n]*/g, (match) =>
            match.replace(/[^\r\n]/g, " ")
        );
    }

    return result;
}

function containsComment(source, language) {
    const stringsMasked = source.replace(
        /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
        (match) => match.replace(/[^\r\n]/g, " ")
    );

    return /\/\/|\/\*/.test(stringsMasked) ||
        (language === "python" && /(^|\s)#/.test(stringsMasked));
}

function analyzeCode(code, language) {
    const strengths = [];
    const improvements = [];
    const normalizedLanguage = String(language || "").trim().toLowerCase();
    const source = codeOnly(code, normalizedLanguage);
    let correctedCode = code;

    if (code.trim()) {
        addUnique(strengths, "The code was successfully received and analyzed.");
    }

    if (code.trim().length < 500) {
        addUnique(strengths, "The submitted code is relatively concise.");
    }

    if (containsComment(code, normalizedLanguage)) {
        addUnique(strengths, "The code contains comments, which can improve readability.");
    } else {
        addUnique(improvements, "Consider adding comments to explain important or non-obvious logic.");
    }

    if (normalizedLanguage !== "python") {
        const openingBraces = (source.match(/{/g) || []).length;
        const closingBraces = (source.match(/}/g) || []).length;

        if (openingBraces === closingBraces) {
            addUnique(strengths, "The code has balanced curly braces.");
        } else {
            addUnique(improvements, "The number of opening and closing curly braces does not match.");
        }
    }

    if (normalizedLanguage === "c++" || normalizedLanguage === "cpp") {
        analyzeCpp(source, code, strengths, improvements, (value) => {
            correctedCode = value;
        });
    } else if (normalizedLanguage === "java") {
        analyzeJava(source, strengths, improvements);
    } else if (normalizedLanguage === "python") {
        analyzePython(source, strengths, improvements);
    } else if (normalizedLanguage === "javascript" || normalizedLanguage === "js") {
        analyzeJavaScript(source, strengths, improvements);
    } else if (normalizedLanguage === "c") {
        analyzeC(source, strengths, improvements);
    }

    if (strengths.length === 0) {
        addUnique(strengths, "The code was successfully received by the analyzer.");
    }

    if (improvements.length === 0) {
        addUnique(improvements, "No major rule-based issues were detected. Consider testing edge cases and improving documentation.");
    }

    return { strengths, improvements, correctedCode };
}

function analyzeCpp(source, originalCode, strengths, improvements, setCorrectedCode) {
    if (/^\s*#\s*include\b/m.test(source)) {
        addUnique(strengths, "The program includes C++ header files.");
    }

    const hasMain = /\bint\s+main\s*\(/.test(source);
    if (hasMain) {
        addUnique(strengths, "The program contains a standard C++ main function.");
        if (/\breturn\s+0\s*;/.test(source)) {
            addUnique(strengths, "The main function explicitly returns 0.");
        } else {
            addUnique(improvements, "Consider explicitly returning 0 from main for a conventional C++ program structure.");
        }
    } else {
        addUnique(improvements, "No standard C++ main() function was detected. Make sure the program has a valid entry point.");
    }

    if (/\busing\s+namespace\s+std\s*;/.test(source)) {
        addUnique(improvements, "Consider avoiding 'using namespace std' in larger projects because it can cause namespace conflicts.");
    }

    if (/\bendl\b/.test(source)) {
        addUnique(improvements, "Consider using '\\n' instead of 'endl' when flushing the output buffer is unnecessary.");
    }

    if (/\b(?:std::)?vector\s*</.test(source)) {
        addUnique(strengths, "The code uses C++ STL vector for dynamic array handling.");
    }

    if (/\b(?:std::)?vector\s*<[^>]+>\s+[A-Za-z_]\w*\s*\)/.test(source)) {
        addUnique(improvements, "A vector may be passed by value, which can create an unnecessary copy. Consider passing it as 'const vector<...>&' when modification is not required.");
    }

    if (/\b(?:for|while)\s*\(|\bdo\s*{/.test(source)) {
        addUnique(strengths, "The code uses iteration to process data.");
    }

    // This detects only C++ function definitions. It intentionally performs no
    // recursion check: a declaration alone never proves that a function is recursive.
    const functionDefinition = /^\s*(?:template\s*<[^>]+>\s*)?(?:[A-Za-z_]\w*(?:::[A-Za-z_]\w*)?(?:\s*<[^>{};()]+>)?\s*[*&]?\s+)+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?\{/gm;
    if (functionDefinition.test(source)) {
        addUnique(strengths, "The code uses functions to organize program logic.");
    }

    if (/\[[A-Za-z_]\w*\]/.test(source)) {
        addUnique(strengths, "The code uses indexed access to work with array or vector elements.");
    }

    const unsafeBoundaries = [];
    const boundaryPattern = /\b([A-Za-z_]\w*)\s*<=\s*([A-Za-z_]\w*)\s*\.\s*size\s*\(\s*\)/g;
    let match;
    while ((match = boundaryPattern.exec(source)) !== null) {
        const [, indexName, containerName] = match;
        const indexedContainer = new RegExp(
            "\\b" + escapeRegExp(containerName) + "\\s*\\[\\s*" + escapeRegExp(indexName) + "\\s*\\]"
        );
        if (indexedContainer.test(source)) {
            unsafeBoundaries.push({ indexName, containerName });
        }
    }

    if (unsafeBoundaries.length > 0) {
        addUnique(improvements, "Potential array/vector out-of-bounds error: use '<' instead of '<=' because valid indexes go from 0 to size - 1.");

        const seen = new Set();
        let fixedCode = originalCode;
        for (const { indexName, containerName } of unsafeBoundaries) {
            const key = `${indexName}:${containerName}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const safeReplacement = new RegExp(
                "\\b(" + escapeRegExp(indexName) + ")(\\s*)<=(\\s*)(" +
                escapeRegExp(containerName) + "\\s*\\.\\s*size\\s*\\(\\s*\\))",
                "g"
            );
            fixedCode = fixedCode.replace(safeReplacement, "$1$2<$3$4");
        }
        setCorrectedCode(fixedCode);
    }

    // Detect a literal index that is outside a fixed C-style array declaration.
    // This is intentionally limited to numeric literals: changing an index
    // automatically would be unsafe because the intended value is unknown.
    const fixedArraySizes = new Map();
    const fixedArrayDeclaration = /\b(?:[A-Za-z_]\w*(?:\s*[*&])?\s+)+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/g;
    while ((match = fixedArrayDeclaration.exec(source)) !== null) {
        fixedArraySizes.set(match[1], Number(match[2]));
    }

    let literalIndexOutOfBounds = false;
    for (const [arrayName, size] of fixedArraySizes) {
        const literalIndex = new RegExp("\\b" + escapeRegExp(arrayName) + "\\s*\\[\\s*(\\d+)\\s*\\]", "g");
        let indexMatch;
        while ((indexMatch = literalIndex.exec(source)) !== null) {
            if (Number(indexMatch[1]) >= size) {
                literalIndexOutOfBounds = true;
                break;
            }
        }
        if (literalIndexOutOfBounds) break;
    }

    if (literalIndexOutOfBounds) {
        addUnique(improvements, "Potential array out-of-bounds error: a fixed-size array is accessed with an index equal to or greater than its declared size.");
    }

    if (/\/\s*0(?:\D|$)/.test(source)) {
        addUnique(improvements, "Potential division-by-zero error detected. Make sure the divisor cannot be zero.");
    }

    if (/%\s*0(?:\D|$)/.test(source)) {
        addUnique(improvements, "Potential modulo-by-zero error detected. Make sure the divisor cannot be zero.");
    }

    if (/\bif\s*\([^()=!<>]*=(?!=)[^()]*\)/.test(source)) {
        addUnique(improvements, "Possible assignment inside an if condition detected. Check whether '=' should actually be '=='.");
    }

    if (/\bnew\b/.test(source)) {
        addUnique(strengths, "The code uses dynamic memory allocation.");
        if (!/\bdelete(?:\[\])?\b/.test(source)) {
            addUnique(improvements, "Memory is allocated using 'new', but no matching 'delete' was detected. Review memory management to avoid memory leaks.");
        }
    } else if (/\bdelete(?:\[\])?\b/.test(source)) {
        addUnique(improvements, "A delete operation was detected without an obvious matching new allocation. Verify that the pointer is valid.");
    }

    if (/\b(?:cin|getline)\b/.test(source)) addUnique(strengths, "The program accepts input from the user.");
    if (/\b(?:cout|printf)\s*\(/.test(source) || /\bcout\s*<</.test(source)) addUnique(strengths, "The program produces output for the user.");
    if (/\bint\s+[A-Za-z_]\w*\s*\[\s*\d+\s*\]/.test(source)) addUnique(improvements, "A fixed-size array was detected. Consider using vector when the required size may change dynamically.");
    if (/\b(?:int|char|float|double)\s*\*\s*[A-Za-z_]\w*/.test(source)) addUnique(improvements, "Raw pointer usage detected. Prefer safer RAII-based approaches such as vector, string, or smart pointers when appropriate.");
}

function analyzeJava(source, strengths, improvements) {
    if (/\bpublic\s+static\s+void\s+main\s*\(/.test(source)) addUnique(strengths, "The Java program contains a standard main method.");
    if (/\bSystem\.out\.println\s*\(/.test(source)) addUnique(strengths, "The program uses standard Java output functionality.");
    if (/\bArrayList\b/.test(source)) addUnique(strengths, "The code uses ArrayList for dynamic collection handling.");
    if (/\bScanner\b/.test(source)) addUnique(strengths, "The program uses Scanner for user input.");

    const stringNames = [...source.matchAll(/\bString\s+([A-Za-z_]\w*)/g)].map((match) => match[1]);
    if (stringNames.some((name) => new RegExp("\\b" + escapeRegExp(name) + "\\s*==|==\\s*" + escapeRegExp(name) + "\\b").test(source))) {
        addUnique(improvements, "When comparing Java Strings, use equals() for value comparison instead of ==.");
    }
}

function analyzePython(source, strengths, improvements) {
    if (/^\s*def\s+[A-Za-z_]\w*\s*\(/m.test(source)) addUnique(strengths, "The code uses functions to organize logic.");
    if (/\b(?:for|while)\b/.test(source)) addUnique(strengths, "The Python code uses iteration.");
    if (/^\s*(?:import|from)\b/m.test(source)) addUnique(strengths, "The program uses Python modules.");
    if (/^\s*except\s*:/m.test(source)) addUnique(improvements, "Avoid broad bare 'except:' blocks when possible. Catch specific exceptions instead.");
    if (/\/\s*0(?:\D|$)/.test(source)) addUnique(improvements, "Potential division-by-zero error detected.");
}

function analyzeJavaScript(source, strengths, improvements) {
    if (/\b(?:const|let)\b/.test(source)) addUnique(strengths, "The code uses modern JavaScript variable declarations.");
    if (/\bvar\b/.test(source)) addUnique(improvements, "Consider using 'let' or 'const' instead of 'var' in modern JavaScript.");
    if (/\bfunction\s+[A-Za-z_]\w*\s*\(|=>/.test(source)) addUnique(strengths, "The code uses functions to organize logic.");
    if (/\b(?:async|await)\b/.test(source)) addUnique(strengths, "The code uses asynchronous JavaScript functionality.");
    if (/\bconsole\.log\s*\(/.test(source)) addUnique(improvements, "Remove unnecessary console.log statements before deploying production code.");
    if (/(^|[^=!])==(?!=)/.test(source)) addUnique(improvements, "Consider using strict equality '===' instead of '==' to avoid unexpected type coercion.");
}

function analyzeC(source, strengths, improvements) {
    if (/^\s*#\s*include\b/m.test(source)) addUnique(strengths, "The program includes required C headers.");
    if (/\bprintf\s*\(/.test(source)) addUnique(strengths, "The code uses standard C output functionality.");
    if (/\bscanf\s*\(/.test(source)) addUnique(strengths, "The program accepts input using standard C input functionality.");
    if (/\b(?:malloc|calloc|realloc)\s*\(/.test(source)) {
        addUnique(strengths, "The program uses dynamic memory allocation.");
        if (!/\bfree\s*\(/.test(source)) addUnique(improvements, "Dynamic memory allocation was detected, but no free() call was found. Make sure allocated memory is released.");
    }
}

// POST /api/code-review
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { language, originalCode } = req.body;

        if (typeof language !== "string" || !language.trim() || typeof originalCode !== "string" || !originalCode.trim()) {
            return res.status(400).json({ message: "Language and code are required." });
        }

        const feedback = analyzeCode(originalCode, language);
        const review = await CodeReview.create({
            userId: req.userId,
            language,
            originalCode,
            feedback
        });

        return res.status(201).json({
            message: "Code review completed successfully.",
            review
        });
    } catch (error) {
        console.error("Code review error:", error);
        return res.status(500).json({
            message: "Code review failed.",
            error: error.message
        });
    }
});

// GET /api/code-review/history
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const reviews = await CodeReview.find({ userId: req.userId }).sort({ createdAt: -1 });
        return res.json({ reviews });
    } catch (error) {
        console.error("History error:", error);
        return res.status(500).json({ message: "Could not fetch review history." });
    }
});

// DELETE /api/code-review/:id
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const review = await CodeReview.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        return res.json({ message: "Review deleted successfully." });
    } catch (error) {
        console.error("Delete review error:", error);
        return res.status(500).json({ message: "Could not delete review." });
    }
});

module.exports = router;
