const cheerio = require("cheerio");
const axios = require("axios");

// change these variables
const url = "";
const author = "";
const header = 
``;
const outputFile = "output.java";


async function performScraping() {
  const axiosResponse = await axios.request({
    method: "GET",
    url: url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

  const cleanSpaces = (word) =>
    word.replace(/(\r\n|\n|\r)/gm, "").replace(/\u00a0/g, " ");

  const wrapCommentText = (text, tab = true, author = null, maxLineLength = 98) => {
    text = text.replace(/(\r\n|\n|\r)/gm, "");
    const words = text.split(" ");
    let currentLine = " * ";
    if (tab) currentLine = "\t" + currentLine;
    const wrappedLines = [];

    words.forEach((word) => {
      if ((currentLine + word).length > maxLineLength) {
        // if adding the next word exceeds the limit, push the current line with a * prefix
        wrappedLines.push(currentLine.trimEnd());
        currentLine = " * " + word + " ";
        if (tab) currentLine = "\t" + currentLine;
      } else {
        currentLine += word + " ";
      }
    });

    // add any remaining text as the last line
    if (currentLine) {
      wrappedLines.push(currentLine.trimEnd());
    }

    if (tab) return "\t/**\n" + wrappedLines.join("\n") + "\n\t"; // return for comments inside the class
    if (author)return ("/**\n" +wrappedLines.join("\n") +
        `\n * \n * @author ${author}\n * \n */\n`); // return for class comments
    return "/**\n" + wrappedLines.join("\n") + "\n */\n"; // default return, shouldn't be used
  };

  const writeJavaDocs = async (text, note) => {
    await appendFile(outputFile, text, fileWrite);
    const notes = note.find("dt");
    if (notes.length) {
      let overrides = false;
      let content = "";
      notes.each((index, element) => {
        let initial = "\t * @";
        if ($(element).text() === "Parameters:") initial += "param ";
        else if ($(element).text() === "Throws:") initial += "throws ";
        else if ($(element).text() === "Returns:") initial += "return ";

        if ($(element).text() === "Overrides:") {
          overrides = true;
        } else {
          const ddElements = $(element).nextUntil("dt", "dd");
          ddElements.each((_, ddElement) => {
            content += initial + $(ddElement).text().replace(/\s*-\s*/g, " ") + "\n";
          });
        }
      });
      if (overrides) content = content.slice(1, -1) + " */\n\t@Overrides\n\t";
      else content = " * \n\t" + content.slice(1, -1) + "\n\t */\n\t";
      await appendFile(outputFile, content, fileWrite);
    } else {
      await appendFile(outputFile, " */\n\t", fileWrite);
    }
  };

  const fileWrite = (err) => {
    if (err) {
      console.error("Error writing file:", err);
    }
  };

  const appendFile = async (filePath, data) => {
    await fs.appendFile(filePath, data);
  };

  const $ = cheerio.load(axiosResponse.data);
  const fs = require("fs").promises;

  
  // clear outputFile before every run
  fs.writeFile(outputFile, "", fileWrite);

  // write header
  await appendFile(outputFile, header, fileWrite);

  // write class comment
  const classComment = $("#class-description").find(".block");
  let content = "";
  content += wrapCommentText(classComment.text(), false, author);
  await appendFile(outputFile, content, fileWrite);

  // write signature
  const signature = $(".type-signature");
  content = "";
  content += signature.find(".modifiers").text();
  content += signature.find(".element-name.type-name-label").text();
  content += " {\n";
  await appendFile(outputFile, content, fileWrite);

  // write fields
  const fields = $("#field-detail .member-list li");
  if (fields.length) {
    for (const element of fields) {
      let field = $(element).find(".detail .member-signature").text();
      field = field.replace(/\u00a0/g, " ");
      await appendFile(outputFile, "\t" + field + ";\n");
    }
  }

  // write constructor
  const constructor = $("#constructor-detail .member-list");
  const constructorNotes = constructor.find(".notes");
  await writeJavaDocs(
    "\n" + wrapCommentText(constructor.find(".block").text()),
    constructorNotes
  );
  const constructorSignature =
    cleanSpaces(constructor.find(".member-signature").text()) +
    " {\n\t\t\n\t}\n\t";
  await appendFile(outputFile, constructorSignature, fileWrite);

  // write methods
  const methods = $("#method-detail .member-list li");
  if (methods.length) {
    for (const method of methods) {
      methodNotes = $(method).find(".notes");
      await writeJavaDocs(
        "\n" + wrapCommentText($(method).find(".block").text()),
        methodNotes
      );

      let methodSignature =
        cleanSpaces($(method).find(".member-signature").text()) + " {\n\t\t";
      const returnType = $(method).find(".return-type").text();
      if (returnType === "int" || returnType === "double") methodSignature += "return 0;"
      else if (returnType === "boolean") methodSignature += "return false;"
      else if (returnType === "void") ;
      else methodSignature += "return null;"
      methodSignature += "\n\t}\n\t";
      await appendFile(outputFile, methodSignature, fileWrite);
    }
  }

  await appendFile(outputFile, "\n}", fileWrite); // end brackets for the class
}

performScraping();
