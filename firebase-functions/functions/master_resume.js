/**
 * Master Resume Template (LaTeX)
 * This file is self-contained and uses String.raw to safely embed LaTeX.
 */

let MASTER_RESUME_CONTENT = String.raw`\documentclass[letterpaper,10pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

% Font options - uncomment your preferred font
% \usepackage[sfdefault]{roboto}
% \usepackage[sfdefault]{noto-sans}
\usepackage[default]{lato}

\pagestyle{fancy}
\fancyhf{} % clear all header and footer fields
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Adjust margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%


\begin{document}

%----------HEADER----------
\begin{center}
    \textbf{\Huge \scshape YOUR NAME} \\ \vspace{1pt}
    \small 000-000-0000 $|$ \href{mailto:email@example.com}{\underline{email@example.com}} $|$ 
    \href{https://linkedin.com/in/yourprofile}{\underline{linkedin.com/in/yourprofile}}
\end{center}

%----------TITLE----------
\begin{center}
    \textbf{\large YOUR TARGET JOB TITLE $|$ KEY SKILLS}
\end{center}


%-----------SUMMARY-----------
\section{Summary}
  \small{Brief professional summary highlighting your key achievements and core competencies. This section should be tailored based on the target role.}


%-----------CORE COMPETENCIES-----------
\section{Core Competencies}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Strategy \& Enablement}{: Technical Storytelling, Demo Environment Strategy, Sales Enablement, GTM \& Product Alignment, Cross-Functional Leadership} \\
     \textbf{Technical}{: Platform Orchestration, Enterprise API Strategy, Real-time Observability, Cloud Infrastructure (AWS/Azure), Zero Trust Security}
    }}
 \end{itemize}


%-----------EXPERIENCE-----------
\section{Professional Experience}
  \resumeSubHeadingListStart

    \resumeSubheading
      {Company Name}{Jan 2000 -- Present}
      {Job Title -- Core Focus}{}
      \resumeItemListStart
        \resumeItem{\textbf{Key Achievement 1:} Describe your role and impact. Use metrics where possible (e.g., increased revenue by X\%, reduced latency by Yms).}
        \resumeItem{\textbf{Key Achievement 2:} Describe another major accomplishment, focusing on technical skills and leadership.}
        \resumeItem{\textbf{Key Achievement 3:} Highlight cross-functional collaboration or strategic contributions.}
      \resumeItemListEnd

    \resumeSubheading
      {Previous Company}{June 1900 -- Jan 2000}
      {Previous Job Title -- Engineering/Product Focus}{}
      \resumeItemListStart
        \resumeItem{\textbf{Achievement 1:} Detail your contributions to the product or platform architecture.}
        \resumeItem{\textbf{Achievement 2:} Explain how you improved reliability, observability, or performance.}
      \resumeItemListEnd

  \resumeSubHeadingListEnd


%-----------STRATEGIC PROJECTS-----------
\section{Strategic Projects}
    \resumeSubHeadingListStart
      \resumeProjectHeading
          {\textbf{Project Name} $|$ \emph{Associated Company/Organization}}{Year}
          \resumeItemListStart
            \resumeItem{\textbf{Impact:} Quantifiable result or major outcome of the project.}
            \resumeItem{\textbf{Detail:} Briefly explain the technical stack, your specific contributions, and the problem solved.}
          \resumeItemListEnd
          
      \resumeProjectHeading
          {\textbf{Another Strategic Project} $|$ \emph{Platform/Context}}{Year}
          \resumeItemListStart
            \resumeItem{\textbf{Impact:} 00\% improvement in X, or \$00M saved/earned.}
            \resumeItem{\textbf{Detail:} Detailed breakdown of the architecture, security, or leadership involved.}
          \resumeItemListEnd
    \resumeSubHeadingListEnd


%-----------EDUCATION \& CERTIFICATIONS-----------
\section{Education \& Certifications}
  \resumeSubHeadingListStart
    \resumeSubheading
      {University Name}{Year Range}
      {Degree Name}{}
    \resumeSubheading
      {Another Institution}{Year}
      {Relevant Degree or Certification}{}
  \resumeSubHeadingListEnd

  \vspace{-12pt}
  
  \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Certifications}{: List your relevant industry certifications here (e.g., AWS, Azure, Scrum, Security).}
    }}
 \end{itemize}

%-------------------------------------------
\end{document}
`;

try {
  const PERSONAL_RESUME = require('./secrets_resume');
  if (PERSONAL_RESUME) {
    MASTER_RESUME_CONTENT = PERSONAL_RESUME;
  }
} catch (e) {
  console.info("Using default LaTeX template (secrets_resume.js not found)");
}

module.exports = MASTER_RESUME_CONTENT;
