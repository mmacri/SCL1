import { loadProgress, setRole, setLearnerName, setLearnerEmail, setEnrollmentInfo, clearIfDifferentCourse } from './storage.js';
import { upsertLearner, upsertEnrollment } from './api-client.js';

const moduleStepMap = {
  'Home / Start': ['mission-control'],
  'Module 1 - CSIR Overview': ['mission-control', 'csir-basics'],
  'Module 2 - Roles & Communications': ['roles', 'comms'],
  'Module 3 - Terminology & Severity': ['definitions', 'severity'],
  'Module 4 - Workflow by Phase': ['workflow', 'response'],
  'Module 5 - Reporting & Documentation': ['reporting', 'evidence']
};

const roleSummary = {
  'all-staff': 'Recognize suspicious activity, report promptly, and complete annual training.',
  'csir-team': 'Support investigation tasks, capture incident log entries, and coordinate with Technical Lead.',
  'technical-lead': 'Lead technical investigation, refine severity, recommend containment and recovery actions.',
  'incident-commander': 'Set objectives, oversee ICS use, and ensure reporting in required timeframes.',
  'nerc-compliance': 'Advise on CIP obligations, maintain compliance evidence, and organize reviews/tests.',
  ecs: 'Maintain the CSIR plan, support classification/reportability, and steward incident evidence.',
};

const roleModal = document.getElementById('roleModal');
const roleOptions = document.getElementById('roleOptions');
const roleSave = document.getElementById('roleSave');
const roleClose = document.getElementById('roleClose');
const roleBadge = document.getElementById('roleBadge');
const roleSummaryEl = document.getElementById('roleSummary');
const moduleProgress = document.getElementById('moduleProgress');
const moduleRail = document.getElementById('moduleRail');
const switchRole = document.getElementById('switchRole');
const remindSwitch = document.getElementById('remindSwitch');
const assumptionCards = document.querySelectorAll('.assumption-card');
const assumptionDetail = document.getElementById('assumptionDetail');
const resumeLink = document.getElementById('resumeLink');
const threatSegments = document.querySelectorAll('.threat-segment');
const threatDetail = document.getElementById('threatDetail');
const roleNameInput = document.getElementById('roleName');
const roleEmailInput = document.getElementById('roleEmail');

let selectedRole = null;

function loadPack() {
  return fetch('./contentpacks/scl-csir/pack.json').then((r) => {
    if (!r.ok) throw new Error('Unable to load CSIR pack');
    return r.json();
  });
}

function renderModules(progress) {
  if (!moduleProgress) return;
  const completed = progress.completedSteps || [];
  const fragments = [];
  const entries = Object.entries(moduleStepMap);
  const railItems = [];

  entries.forEach(([label, steps]) => {
    const done = steps.every((id) => completed.includes(id));
    const started = steps.some((id) => completed.includes(id));
    const item = document.createElement('div');
    item.className = 'module-chip' + (done ? ' complete' : started ? ' in-progress' : '');
    item.innerHTML = `<div class="module-title">${label}</div><div class="module-status">${done ? 'Complete' : started ? 'In progress' : 'Not started'}</div>`;
    fragments.push(item);

    if (moduleRail) {
      const rail = document.createElement('div');
      rail.className = 'rail-item' + (done ? ' complete' : started ? ' in-progress' : '');
      rail.innerHTML = `<div class="rail-dot"></div><div>${label.replace('Module ', 'M')}</div>`;
      railItems.push(rail);
    }
  });

  moduleProgress.innerHTML = '';
  fragments.forEach((f) => moduleProgress.appendChild(f));

  if (moduleRail) {
    moduleRail.innerHTML = '';
    railItems.forEach((r) => moduleRail.appendChild(r));
  }
}

function updateRoleUI(roleId, pack) {
  const roleObj = pack.roles.find((r) => r.id === roleId);
  if (roleObj) {
    if (roleBadge) roleBadge.textContent = `Role: ${roleObj.label}`;
    if (roleSummaryEl) roleSummaryEl.textContent = roleSummary[roleId] || roleObj.whoItsFor;
  } else {
    if (roleBadge) roleBadge.textContent = 'Select a role to personalize content';
    if (roleSummaryEl) roleSummaryEl.textContent = 'No role selected yet.';
  }
}

function initRoleModal(pack) {
  roleOptions.innerHTML = '';
  const saved = loadProgress().roleId;

  pack.roles.forEach((role) => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `<h3>${role.label}</h3><p class="small">${role.whoItsFor}</p><div class="role-meta">Est. ${role.estMinutes} minutes</div>`;
    if (saved === role.id) {
      card.classList.add('selected');
      selectedRole = role.id;
      validateRoleModal();
    }
    card.addEventListener('click', () => {
      document.querySelectorAll('#roleOptions .role-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = role.id;
      validateRoleModal();
    });
    roleOptions.appendChild(card);
  });
}

function validateRoleModal() {
  const nameOk = roleNameInput?.value.trim().length >= 2;
  const emailOk = roleEmailInput?.value.trim().length >= 5 && roleEmailInput.value.includes('@');
  roleSave.disabled = !(selectedRole && nameOk && emailOk);
}

async function syncLearnerEnrollment() {
  const progress = loadProgress();
  if (!progress.learnerName || !progress.learnerEmail || !progress.roleId) return;
  const res = await fetch('./contentpacks/scl-csir/pack.json');
  const pack = await res.json();
  const version = pack.course.version || '';
  const year = Number(version.slice(0, 4)) || new Date().getFullYear();
  const courseCode = `CSIR-${year}`;
  const learner = await upsertLearner({
    email: progress.learnerEmail,
    fullName: progress.learnerName,
    roleSelected: progress.roleId
  });
  const enrollment = await upsertEnrollment({
    email: progress.learnerEmail,
    courseCode,
    cycleYear: year
  });
  setEnrollmentInfo({
    enrollmentId: enrollment.enrollmentId,
    learnerId: learner.learnerId,
    courseCode,
    cycleYear: year
  });
}

function openRoleModal() {
  if (typeof roleModal.showModal === 'function') {
    roleModal.showModal();
  } else {
    roleModal.setAttribute('open', 'open');
  }
}

function closeRoleModal() {
  if (roleModal.open) roleModal.close();
}

function wireAssumptions() {
  assumptionCards.forEach((card) => {
    card.addEventListener('click', () => {
      assumptionDetail.style.display = 'block';
      assumptionDetail.textContent = card.dataset.details || '';
    });
  });
}

function wireThreatWheel() {
  if (!threatSegments.length || !threatDetail) return;
  threatSegments.forEach((segment) => {
    segment.addEventListener('click', () => {
      threatSegments.forEach((s) => s.classList.remove('active'));
      segment.classList.add('active');
      threatDetail.textContent = segment.dataset.example || '';
    });
  });
}

function updateResumeLink(progress) {
  if (!resumeLink) return;
  const hasProgress =
    Boolean(progress.roleId) ||
    Boolean(progress.learnerName) ||
    (progress.completedSteps && progress.completedSteps.length > 0) ||
    (progress.viewedSteps && progress.viewedSteps.length > 0);
  resumeLink.style.display = hasProgress ? 'inline-flex' : 'none';
}

loadPack()
  .then((pack) => {
    const progress = clearIfDifferentCourse(pack.course.version);
    renderModules(progress);
    updateRoleUI(progress.roleId, pack);
    initRoleModal(pack);
    updateResumeLink(progress);
    if (roleNameInput && progress.learnerName) roleNameInput.value = progress.learnerName;
    if (roleEmailInput && progress.learnerEmail) roleEmailInput.value = progress.learnerEmail;
    validateRoleModal();

    if (!progress.roleId || !progress.learnerName || !progress.learnerEmail) {
      openRoleModal();
    }

    roleSave.addEventListener('click', () => {
      if (!selectedRole) return;
      setRole(selectedRole);
      if (roleNameInput?.value) setLearnerName(roleNameInput.value);
      if (roleEmailInput?.value) setLearnerEmail(roleEmailInput.value);
      updateRoleUI(selectedRole, pack);
      syncLearnerEnrollment().catch((err) => console.warn('API sync failed', err));
      closeRoleModal();
    });

    roleNameInput?.addEventListener('input', validateRoleModal);
    roleEmailInput?.addEventListener('input', validateRoleModal);

    [switchRole, remindSwitch].forEach((btn) => {
      if (btn) btn.addEventListener('click', openRoleModal);
    });

    if (roleClose) roleClose.addEventListener('click', closeRoleModal);
  })
  .catch((err) => {
    console.error(err);
    if (moduleProgress) {
      moduleProgress.innerHTML = '<p class="alert">Unable to load CSIR data.</p>';
    }
  });

wireAssumptions();
wireThreatWheel();
