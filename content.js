// content.js

// Function to extract student details and grades from the portal
function extractStudentData() {
  const studentData = {
    name: "",
    id: "",
    program: "",
    academicYear: "",
    yearOfProgram: "",
  };

  // Extract student details
  const studentDetailsTable = document.querySelector(
    ".region #report_R69220732744928352"
  );
  if (studentDetailsTable) {
    const rows = studentDetailsTable.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const label = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();

        if (label.includes("Name")) studentData.name = value;
        if (label.includes("ID Number")) studentData.id = value;
        if (label.includes("Program")) studentData.program = value;
        if (label.includes("Academic Year")) studentData.academicYear = value;
        if (label.includes("Year of Program"))
          studentData.yearOfProgram = value;
      }
    });
  }

  // Extract grades - FIXED IMPLEMENTATION
  const grades = [];
  const resultsTable = document.querySelector(
    ".region #report_R69240416064169453"
  );
  if (resultsTable) {
    console.log("[BUID++] Found results table, extracting grades");

    // First, try to find the header row to understand the table structure
    const headerRow =
      resultsTable.querySelector("thead tr") ||
      resultsTable.querySelector("tbody tr:first-child");
    let courseIndex = 1; // Default indices if header parsing fails
    let creditsIndex = 2;
    let resultIndex = 3;
    let gradeIndex = 5;

    // Try to determine column indices from headers
    if (headerRow) {
      const headers = Array.from(headerRow.querySelectorAll("th")).map((th) =>
        th.textContent.trim().toLowerCase()
      );
      headers.forEach((header, index) => {
        if (header.includes("course") || header.includes("module"))
          courseIndex = index;
        if (header.includes("credit")) creditsIndex = index;
        if (header.includes("result") && !header.includes("letter"))
          resultIndex = index;
        if (
          header.includes("grade") ||
          (header.includes("result") && header.includes("letter"))
        )
          gradeIndex = index;
      });
    }

    const rows = resultsTable.querySelectorAll("tbody tr");

    // Skip header row(s) - look for rows with actual course data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll("td");

      // Only proceed if we have enough cells and this looks like a valid module row
      if (
        cells.length >
        Math.max(courseIndex, creditsIndex, resultIndex, gradeIndex)
      ) {
        const module = cells[courseIndex].textContent.trim();
        const credits = parseFloat(cells[creditsIndex].textContent.trim()) || 0;
        const result = cells[resultIndex].textContent.trim();
        const grade = cells[gradeIndex].textContent.trim();

        // Filter out header or non-course rows
        if (
          module &&
          !module.toLowerCase().includes("weight") &&
          !module.toLowerCase().includes("title") &&
          !module.toLowerCase().includes("course") &&
          credits > 0
        ) {
          grades.push({
            module,
            credits,
            result,
            grade,
          });
        }
      }
    }

    console.log("[BUID++] Extracted grades:", grades);
  }

  // Extract GPA from GPA Progress table - ENHANCED IMPLEMENTATION
  const gpaProgressTable = document.querySelector(
    ".region #report_R8228421969779651"
  );

  const gpaData = {
    yearlyGPA: null,
    cumulativeGPA: null,
    totalPoints: 0,
    totalCredits: 0,
    modules: [],
    terms: [], // Store data for each term (dropdown)
  };

  if (gpaProgressTable) {
    console.log("[BUID++] Found GPA Progress table");

    // Extract term data from the main GPA Progress table rows
    const mainRows = gpaProgressTable.querySelectorAll("tbody tr");
    let currentYear = "";
    let yearTerms = [];
    let yearModules = [];

    // Process each row in the main GPA Progress table
    mainRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      // Check if this is a term row (typically has a specific structure)
      if (cells.length >= 4 && cells[0]?.textContent?.trim()) {
        const termName = cells[0]?.textContent?.trim();
        const awardGPA = cells[1]?.textContent?.trim(); // This is usually "-" but we'll replace it
        const creditsAttempted = parseFloat(cells[2]?.textContent?.trim()) || 0;
        const creditsEarned = parseFloat(cells[3]?.textContent?.trim()) || 0;

        // Extract year and term from term name (e.g., "Bachelor of Science in Computer Science - BSCS_AI_3 [2022]")
        const yearMatch = termName.match(/\[(\d{4})\]/);
        const termMatch = termName.match(/_(\d+)/);
        const year = yearMatch ? yearMatch[1] : "";
        const termNumber = termMatch ? parseInt(termMatch[1]) : 0;

        // Get the detail span for this term (contains modules)
        const detailId = row
          .querySelector("a")
          ?.getAttribute("onclick")
          ?.match(/\'(detail_\w+)\'/)?.[1];
        const detailSpan = detailId ? document.getElementById(detailId) : null;

        const termModules = [];
        let termPoints = 0;
        let termCredits = 0;

        // Extract modules for this term
        if (detailSpan) {
          const moduleTable = detailSpan.querySelector("table");
          if (moduleTable) {
            const moduleRows = moduleTable.querySelectorAll("tbody tr");

            // Skip the header row
            for (let i = 1; i < moduleRows.length; i++) {
              const moduleRow = moduleRows[i];
              const moduleCells = moduleRow.querySelectorAll("td");

              if (moduleCells.length >= 4) {
                const module = moduleCells[0]?.textContent.trim();
                const credits =
                  parseFloat(moduleCells[1]?.textContent.trim()) || 0;
                const grade = moduleCells[2]?.textContent.trim();
                const gradePoints = moduleCells[3]?.textContent.trim()
                  ? parseFloat(moduleCells[3]?.textContent.trim())
                  : null;

                if (
                  module &&
                  credits > 0 &&
                  gradePoints !== null &&
                  grade !== "CT"
                ) {
                  const moduleData = {
                    module,
                    credits,
                    grade,
                    gradePoints,
                    term: termName,
                    year,
                  };

                  termModules.push(moduleData);
                  termPoints += gradePoints * credits;
                  termCredits += credits;

                  // Add to all modules list as well
                  gpaData.modules.push(moduleData);

                  // Add to yearly modules for yearly GPA calculation
                  yearModules.push(moduleData);

                  // Add to the cumulative totals
                  gpaData.totalPoints += gradePoints * credits;
                  gpaData.totalCredits += credits;
                }
              }
            }
          }
        }

        // Calculate CGPA for this term
        const termCGPA =
          termCredits > 0 ? (termPoints / termCredits).toFixed(2) : null;

        // Create term data object
        const termData = {
          name: termName,
          year,
          termNumber,
          awardGPA: "-", // Default, this will be replaced with termCGPA
          termCGPA: termCGPA,
          yearlyGPA: null, // Will be calculated for the last term of each year
          creditsAttempted,
          creditsEarned,
          modules: termModules,
        };

        // Handle year transition
        if (year !== currentYear) {
          // Calculate yearly GPA for the previous year if we have terms
          if (yearTerms.length > 0 && currentYear) {
            // Find the last term of the year
            const lastTerm = yearTerms[yearTerms.length - 1];

            // Calculate yearly GPA
            let yearPoints = 0;
            let yearCredits = 0;
            yearModules.forEach((module) => {
              yearPoints += module.gradePoints * module.credits;
              yearCredits += module.credits;
            });

            const yearlyGPA =
              yearCredits > 0 ? (yearPoints / yearCredits).toFixed(2) : null;

            // Update the last term with yearly GPA
            lastTerm.yearlyGPA = yearlyGPA;
          }

          // Reset for the new year
          currentYear = year;
          yearTerms = [];
          yearModules = [];
        }

        // Update awardGPA with calculated CGPA
        if (termCGPA) {
          termData.awardGPA = termCGPA;
        }

        // Add this term to the current year's terms
        yearTerms.push(termData);

        // Add to all terms list
        gpaData.terms.push(termData);
      }
    });

    // Handle the last year's GPA calculation
    if (yearTerms.length > 0) {
      // Calculate yearly GPA
      let yearPoints = 0;
      let yearCredits = 0;
      yearModules.forEach((module) => {
        yearPoints += module.gradePoints * module.credits;
        yearCredits += module.credits;
      });

      const yearlyGPA =
        yearCredits > 0 ? (yearPoints / yearCredits).toFixed(2) : null;

      // Update the last term with yearly GPA
      const lastTerm = yearTerms[yearTerms.length - 1];
      lastTerm.yearlyGPA = yearlyGPA;

      // Update the overall yearly GPA
      gpaData.yearlyGPA = yearlyGPA;
    }

    // Calculate cumulative GPA
    if (gpaData.totalCredits > 0) {
      gpaData.cumulativeGPA = (
        gpaData.totalPoints / gpaData.totalCredits
      ).toFixed(2);
    }

    console.log("[BUID++] Extracted GPA data:", gpaData);
  } else {
    console.log(
      "[BUID++] GPA Progress table not found, calculating from grades"
    );

    // Calculate GPA from grades if progress table not found
    if (grades.length > 0) {
      // Map grades to points
      const gradePoints = {
        A: 4.0,
        "A-": 3.7,
        "B+": 3.3,
        B: 3.0,
        "B-": 2.7,
        "C+": 2.3,
        C: 2.0,
        "C-": 1.7,
        "D+": 1.3,
        D: 1.0,
        F: 0.0,
      };

      grades.forEach((g) => {
        if (g.grade && g.grade in gradePoints) {
          gpaData.totalPoints += gradePoints[g.grade] * g.credits;
          gpaData.totalCredits += g.credits;
        }
      });

      if (gpaData.totalCredits > 0) {
        gpaData.cumulativeGPA = (
          gpaData.totalPoints / gpaData.totalCredits
        ).toFixed(2);
      }
    }
  }

  // Save all data to storage
  chrome.storage.local.set({
    studentData,
    grades,
    gpaData,
    lastUpdated: new Date().toISOString(),
  });

  console.log("[BUID++] Data saved:", { studentData, grades, gpaData });
}

// Watch for DOM changes to catch when the page is fully loaded
const observer = new MutationObserver(function (mutations) {
  // Look for the specific tables we need
  const studentTable = document.querySelector(
    ".region #report_R69220732744928352"
  );
  const resultsTable = document.querySelector(
    ".region #report_R69240416064169453"
  );
  const gpaProgressTable = document.querySelector(
    ".region #report_R8228421969779651"
  );

  // Try to extract data if any of the tables are found
  if (studentTable || resultsTable || gpaProgressTable) {
    observer.disconnect();
    extractStudentData();
  }
});

// Start observing the document for changes
observer.observe(document.body, { childList: true, subtree: true });

// Also try to extract data after a delay in case the page is already loaded
setTimeout(() => {
  extractStudentData();
}, 2000);

// Apply dark mode if it's enabled
chrome.storage.local.get("darkMode", ({ darkMode }) => {
  if (darkMode) {
    applyDarkMode();
  }
});

// Function to toggle dark mode on the portal
function applyDarkMode() {
  // Create a style element if it doesn't exist
  let style = document.getElementById("buid-plus-plus-dark-mode");
  if (!style) {
    style = document.createElement("style");
    style.id = "buid-plus-plus-dark-mode";
    document.head.appendChild(style);
  }

  // Add dark mode styles
  style.textContent = `
    body, .wrapper {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
    }
    
    .header, .main, .content, .footer, .nav, .main-page {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
    }
    
    table, tr, td, th {
      background-color: #374151 !important;
      color: #f3f4f6 !important;
      border-color: #4b5563 !important;
    }
    
    .highlight-row:hover td {
      background-color: #4b5563 !important;
    }
    
    a {
      color: #60a5fa !important;
    }
    
    .header {
      border-bottom: 1px solid #4b5563 !important;
    }
    
    .formlayout, .report {
      border: 1px solid #4b5563 !important;
    }
    
    input, select, option {
      background-color: #374151 !important;
      color: #f3f4f6 !important;
      border-color: #4b5563 !important;
    }
    
    button, .button-print {
      background-color: #3b82f6 !important;
      color: white !important;
    }
  `;
}

// Listen for messages from the popup to toggle dark mode
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleDarkMode") {
    if (request.enabled) {
      applyDarkMode();
    } else {
      const style = document.getElementById("buid-plus-plus-dark-mode");
      if (style) style.remove();
    }
    sendResponse({ success: true });
  }
});
