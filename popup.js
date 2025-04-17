// popup.js
document.addEventListener("DOMContentLoaded", function () {
  // GPA calculation logic
  function getGpaValue(grade) {
    const map = {
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
    return map[grade] ?? null;
  }

  // Dark mode toggle functionality
  document.getElementById("toggleDark").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    // Save user preference
    const isDarkMode = document.body.classList.contains("dark");
    chrome.storage.local.set({ darkMode: isDarkMode });
  });

  // Load user's dark mode preference
  chrome.storage.local.get("darkMode", ({ darkMode }) => {
    if (darkMode) {
      document.body.classList.add("dark");
    }
  });

  // Load and display student info
  chrome.storage.local.get("studentData", ({ studentData }) => {
    const infoSection = document.getElementById("student-info");

    if (!studentData || Object.values(studentData).every((v) => !v)) {
      infoSection.innerHTML =
        "<p>Visit Student Portal first or Refresh the page</p>";
      return;
    }

    // Create student info display
    const infoHtml = `
      <div class="student-info">
        <span class="label">Name:</span>
        <span class="value">${studentData.name || "N/A"}</span>
        <span class="label">ID:</span>
        <span class="value">${studentData.id || "N/A"}</span>
        <span class="label">Program:</span>
        <span class="value">${studentData.program || "N/A"}</span>
        <span class="label">Academic Year:</span>
        <span class="value">${studentData.academicYear || "N/A"}</span>
        <span class="label">Year of Program:</span>
        <span class="value">${studentData.yearOfProgram || "N/A"}</span>
      </div>
    `;
    infoSection.innerHTML = infoHtml;
  });

  // Load and display grades and GPA
  chrome.storage.local.get(
    ["grades", "gpaData", "lastUpdated"],
    ({ grades, gpaData, lastUpdated }) => {
      const list = document.getElementById("grade-list");
      const gpaEl = document.getElementById("gpa");
      const updateTimeEl = document.getElementById("update-time");
      const termsList = document.getElementById("terms-list");

      // Update last updated time if available
      if (lastUpdated) {
        const date = new Date(lastUpdated);
        updateTimeEl.textContent = `Last updated: ${date.toLocaleString()}`;
      }

      // Display GPA if available
      if (gpaData && gpaData.cumulativeGPA) {
        gpaEl.textContent = gpaData.cumulativeGPA;
      }

      if (!grades || grades.length === 0) {
        list.innerHTML = "<p>No grades yet. Visit Opencampus first.</p>";
        return;
      }

      // Create table for grades
      const table = document.createElement("table");
      table.classList.add("grade-table");

      // Add table header
      const headerRow = document.createElement("tr");
      ["Module", "Grade", "Credits"].forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);

      // Add grade rows
      grades.forEach((g) => {
        // Skip rows that don't look like real grades
        if (
          !g.module ||
          g.module.toLowerCase().includes("weight %") ||
          g.credits <= 0 ||
          !g.grade
        ) {
          return;
        }

        const row = document.createElement("tr");

        const moduleCell = document.createElement("td");
        moduleCell.textContent = g.module;
        row.appendChild(moduleCell);

        const gradeCell = document.createElement("td");
        gradeCell.textContent = g.grade;

        // Add grade styling
        if (g.grade.startsWith("A")) {
          gradeCell.classList.add("grade-a");
        } else if (g.grade.startsWith("B")) {
          gradeCell.classList.add("grade-b");
        } else if (g.grade.startsWith("C")) {
          gradeCell.classList.add("grade-c");
        } else if (g.grade.startsWith("D")) {
          gradeCell.classList.add("grade-d");
        } else if (g.grade.startsWith("F")) {
          gradeCell.classList.add("grade-f");
        }

        row.appendChild(gradeCell);

        const creditsCell = document.createElement("td");
        creditsCell.textContent = g.credits;
        row.appendChild(creditsCell);

        table.appendChild(row);
      });

      list.innerHTML = "";
      list.appendChild(table);

      // Display terms and GPA progress
      if (gpaData && gpaData.terms && gpaData.terms.length > 0) {
        // Sort terms by year and term number
        const sortedTerms = [...gpaData.terms].sort((a, b) => {
          if (a.year !== b.year) return a.year.localeCompare(b.year);
          return a.termNumber - b.termNumber;
        });

        termsList.innerHTML = "";

        // Group terms by academic year
        const yearGroups = {};
        sortedTerms.forEach((term) => {
          if (!yearGroups[term.year]) {
            yearGroups[term.year] = [];
          }
          yearGroups[term.year].push(term);
        });

        // Create UI for each term
        Object.entries(yearGroups).forEach(([year, terms]) => {
          // Create year header
          const yearHeader = document.createElement("div");
          yearHeader.classList.add("year-header");
          yearHeader.textContent = `Academic Year: ${year}`;
          termsList.appendChild(yearHeader);

          terms.forEach((term) => {
            const termItem = document.createElement("div");
            termItem.classList.add("term-item");

            // Create term header (always visible)
            const termHeader = document.createElement("div");
            termHeader.classList.add("term-header");

            // Simplify the term name for display (extract just the term number)
            const displayName = term.name.match(/_(\d+)/)
              ? `Term ${term.name.match(/_(\d+)/)[1]}`
              : term.name;

            // Build term header with GPA information
            let headerHtml = `
            <div class="term-name">${displayName}</div>
            <div class="term-gpa">
              <div>
                <span class="term-gpa-label">CGPA:</span>
                <span class="term-gpa-value">${term.termCGPA || "-"}</span>
              </div>
          `;

            // Add yearly GPA if it exists for this term (only on last term of each year)
            if (term.yearlyGPA) {
              headerHtml += `
              <div>
                <span class="term-gpa-label">Yearly:</span>
                <span class="term-gpa-value yearly-gpa">${term.yearlyGPA}</span>
              </div>
            `;
            }

            headerHtml += `</div>`;
            termHeader.innerHTML = headerHtml;

            // Create content container (expandable)
            const termContent = document.createElement("div");
            termContent.classList.add("term-content");

            // Add modules to the term content
            if (term.modules && term.modules.length > 0) {
              const moduleList = document.createElement("div");
              moduleList.classList.add("module-list");

              term.modules.forEach((mod) => {
                // Module name
                const moduleNameEl = document.createElement("div");
                moduleNameEl.classList.add("module-item");
                moduleNameEl.textContent = mod.module;
                moduleList.appendChild(moduleNameEl);

                // Module grade with appropriate styling
                const gradeEl = document.createElement("div");
                gradeEl.classList.add("module-item");
                gradeEl.textContent = mod.grade;

                if (mod.grade.startsWith("A")) {
                  gradeEl.classList.add("grade-a");
                } else if (mod.grade.startsWith("B")) {
                  gradeEl.classList.add("grade-b");
                } else if (mod.grade.startsWith("C")) {
                  gradeEl.classList.add("grade-c");
                } else if (mod.grade.startsWith("D")) {
                  gradeEl.classList.add("grade-d");
                } else if (mod.grade.startsWith("F")) {
                  gradeEl.classList.add("grade-f");
                }

                moduleList.appendChild(gradeEl);

                // Module credits
                const creditsEl = document.createElement("div");
                creditsEl.classList.add("module-item");
                creditsEl.textContent = mod.credits;
                moduleList.appendChild(creditsEl);
              });

              termContent.appendChild(moduleList);
            } else {
              termContent.innerHTML = "<p>No modules found for this term.</p>";
            }

            // Add event listener to toggle term content visibility
            termHeader.addEventListener("click", () => {
              termContent.classList.toggle("expanded");
              // If expanded, set height to scrollHeight, otherwise back to 0
              if (termContent.classList.contains("expanded")) {
                termContent.style.height = termContent.scrollHeight + "px";
              } else {
                termContent.style.height = "0";
              }
            });

            // Assemble the term item
            termItem.appendChild(termHeader);
            termItem.appendChild(termContent);
            termsList.appendChild(termItem);
          });
        });

        // Add expand all functionality
        document
          .getElementById("expandAllTerms")
          .addEventListener("click", () => {
            const contents = document.querySelectorAll(".term-content");
            const allExpanded = Array.from(contents).every((el) =>
              el.classList.contains("expanded")
            );

            contents.forEach((content) => {
              if (allExpanded) {
                // Collapse all
                content.classList.remove("expanded");
                content.style.height = "0";
              } else {
                // Expand all
                content.classList.add("expanded");
                content.style.height = content.scrollHeight + "px";
              }
            });

            // Update button text
            document.getElementById("expandAllTerms").textContent = allExpanded
              ? "Expand All"
              : "Collapse All";
          });
      } else {
        termsList.innerHTML =
          "<p>No term data available. Visit Opencampus first.</p>";
      }

      // Calculate GPA function
      document.getElementById("calcBtn").onclick = () => {
        let totalPoints = 0;
        let totalCredits = 0;

        grades.forEach((g) => {
          const val = getGpaValue(g.grade);
          if (val !== null) {
            totalPoints += val * g.credits;
            totalCredits += g.credits;
          }
        });

        const gpa =
          totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "-";
        gpaEl.textContent = gpa;
      };
    }
  );
});
