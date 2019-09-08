var svnUltimate = require("node-svn-ultimate");
var papa = require("papaparse");
var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");

var oneTimeOperation = true;

const svnURL = "https://localhost/svn/scbp_db/trunk/tables/MSG_ID_RULES_DTL";
const svnUsername = "admin";
const svnPassword = "admin";
const workingCopyDir = "temp";
const filesToBeUpdated = ["1.csv", "2.csv"];
const fileName = "2.csv";
var fileToBeUpdated;
const columnToBeUpdated = "EMP_MSG_ID";
const valueToBeUpdated = "2";

const waitFor = milleseconds => new Promise(r => setTimeout(r, milleseconds));

// Multi File Operation
async function multiFileOperation() {
  rimraf.sync(workingCopyDir);
  await waitFor(500);
  checkoutEmptyDirForSvn(svnURL, workingCopyDir);
  await asyncForEach(filesToBeUpdated, async fileToBeUpdated => {
    await waitFor(500);
    await getFileFromSvn(workingCopyDir + "/" + fileToBeUpdated);
    await waitFor(500);
    await editFile(workingCopyDir + "/" + fileToBeUpdated);
  });
  await waitFor(500);
  commitFileToSvn(workingCopyDir);
  await waitFor(500);
  rimraf.sync(workingCopyDir);
}

// Single File Operation
async function singleFileOperation() {
  rimraf.sync(workingCopyDir);
  await waitFor(500);
  checkoutEmptyDirForSvn(svnURL, workingCopyDir);
  await waitFor(500);
  fileToBeUpdated = workingCopyDir + "/" + fileName;
  await getFileFromSvn(fileToBeUpdated);
  await waitFor(500);
  await editFile(fileToBeUpdated);
  await waitFor(500);
  commitFileToSvn(workingCopyDir);
  await waitFor(500);
  rimraf.sync(workingCopyDir);
}

if (oneTimeOperation) {
  singleFileOperation();
} else {
  multiFileOperation();
}

function checkoutEmptyDirForSvn(svnURL, workingCopyDir) {
  svnUltimate.commands.checkout(
    svnURL,
    workingCopyDir,
    {
      username: svnUsername,
      password: svnPassword,
      quiet: true,
      depth: "empty"
    },
    function(err) {
      console.log("Checkout complete");
    }
  );
}

async function getFileFromSvn(fileToBeUpdated) {
  svnUltimate.commands.update(fileToBeUpdated, async function(err) {
    console.log("Update complete - " + fileToBeUpdated);
  });
}

async function editFile(fileToBeUpdated) {
  var filePath = path.join(__dirname, fileToBeUpdated);
  var fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
  papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      console.log("Parsed:\n", results.data);
      results.data.forEach(function(row) {
        row[columnToBeUpdated] = valueToBeUpdated;
      });
      console.log("Updated:\n", results.data);
      var finalResults = papa.unparse(results, {
        header: true
      });
      console.log("Unparsed:\n", finalResults);
      try {
        fs.writeFileSync(fileToBeUpdated, finalResults);
      } catch (err) {
        console.error(err);
      }
    }
  });
}

function commitFileToSvn(workingCopyDir) {
  svnUltimate.commands.commit(
    workingCopyDir,
    { params: ['-m "Test Commit"'] },
    function(err) {
      console.log("Commit complete");
    }
  );
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
