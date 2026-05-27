'use strict';

const WORKING_DAYS_PER_WEEK = 5;

const pad = (n) => String(n).padStart(2, '0');

const toDateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseDateOnly = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const isWorkingDay = (date) => {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5;
};

const getWorkingDays = (fromStr, toStr) => {
  const days = [];
  const cur = parseDateOnly(fromStr);
  const end = parseDateOnly(toStr);
  while (cur <= end) {
    if (isWorkingDay(cur)) days.push(toDateOnly(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const startOfWeekMonday = (dateStr) => {
  const d = parseDateOnly(dateStr);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

const getPeriodBounds = (periodType, referenceDate) => {
  const ref = referenceDate || toDateOnly(new Date());

  if (periodType === 'month') {
    const d = parseDateOnly(ref);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthLabel = from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return {
      from: toDateOnly(from),
      to: toDateOnly(to),
      label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      periodType: 'month',
    };
  }

  const monday = startOfWeekMonday(ref);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fromLabel = monday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const toLabel = friday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return {
    from: toDateOnly(monday),
    to: toDateOnly(friday),
    label: `Semaine du ${fromLabel} au ${toLabel}`,
    periodType: 'week',
  };
};

const roundMoney = (n) => Math.round(Number(n) || 0);

const computeDailyRate = (weeklySalary) => roundMoney(Number(weeklySalary) / WORKING_DAYS_PER_WEEK);

const statusLabel = (status, unmarked) => {
  if (unmarked) return 'Non pointé';
  return status || 'Non pointé';
};

const dayDeductionFactor = (status, unmarked) => {
  if (unmarked || status === 'Absent') return 1;
  if (status === 'Demi-journée') return 0.5;
  return 0;
};

const dayPresentFactor = (status, unmarked) => {
  if (unmarked || status === 'Absent') return 0;
  if (status === 'Demi-journée') return 0.5;
  return 1;
};

/**
 * @param {object} opts
 * @param {'week'|'month'} opts.periodType
 * @param {string} opts.referenceDate YYYY-MM-DD
 * @param {object[]} opts.employees Sequelize Employee rows (with currentProject)
 * @param {object[]} opts.attendances Attendance rows for the period
 */
function buildPayrollRecap({ periodType, referenceDate, employees, attendances }) {
  const period = getPeriodBounds(periodType, referenceDate);
  const workingDays = getWorkingDays(period.from, period.to);

  const attendanceMap = new Map();
  for (const att of attendances) {
    const key = `${att.employeeId}_${att.date}`;
    attendanceMap.set(key, att);
  }

  const rows = [];
  const dayDetails = [];
  let grandBase = 0;
  let grandDeductions = 0;
  let grandNet = 0;

  for (const emp of employees) {
    const weeklySalary = roundMoney(emp.weeklySalary);
    const dailyRate = computeDailyRate(weeklySalary);
    if (weeklySalary <= 0) continue;

    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let unmarkedDays = 0;
    let deductions = 0;

    for (const day of workingDays) {
      const att = attendanceMap.get(`${emp.id}_${day}`);
      const unmarked = !att;
      const status = att?.status;

      if (unmarked) unmarkedDays += 1;
      else if (status === 'Absent') absentDays += 1;
      else if (status === 'Demi-journée') halfDays += 1;
      else if (status === 'Retard') lateDays += 1;
      else presentDays += 1;

      const deductFactor = dayDeductionFactor(status, unmarked);
      const dayDeduction = roundMoney(dailyRate * deductFactor);
      deductions += dayDeduction;

      dayDetails.push({
        date: day,
        employeeId: emp.id,
        employeeName: emp.name,
        matricule: emp.matricule || '',
        projectName: emp.currentProject?.name || '—',
        status: statusLabel(status, unmarked),
        dailyRate,
        dayValue: roundMoney(dailyRate * dayPresentFactor(status, unmarked)),
        deduction: dayDeduction,
      });
    }

    const baseAmount =
      periodType === 'week'
        ? weeklySalary
        : roundMoney(dailyRate * workingDays.length);

    const netPay = Math.max(0, baseAmount - deductions);

    grandBase += baseAmount;
    grandDeductions += deductions;
    grandNet += netPay;

    rows.push({
      employeeId: emp.id,
      matricule: emp.matricule || '',
      name: emp.name,
      role: emp.role || '',
      projectName: emp.currentProject?.name || '—',
      weeklySalary,
      dailyRate,
      workingDays: workingDays.length,
      presentDays,
      lateDays,
      absentDays,
      halfDays,
      unmarkedDays,
      baseAmount,
      deductions,
      netPay,
    });
  }

  return {
    period,
    workingDays,
    rows,
    dayDetails,
    totals: {
      employees: rows.length,
      baseAmount: grandBase,
      deductions: grandDeductions,
      netPay: grandNet,
      workingDaysPerWeek: WORKING_DAYS_PER_WEEK,
    },
  };
}

module.exports = {
  WORKING_DAYS_PER_WEEK,
  getPeriodBounds,
  getWorkingDays,
  computeDailyRate,
  buildPayrollRecap,
};
