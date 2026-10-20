/**
 * Расчёт нормы калорий и БЖУ.
 * BMR: формула Mifflin–St Jeor.
 * % жира: метод ВМС США (шея + талия; для женщин ещё бёдра).
 */

const ACTIVITY = {
  low: { label: "Мало двигаюсь", factor: 1.2 },
  light: { label: "Лёгкая активность", factor: 1.375 },
  moderate: { label: "Средняя", factor: 1.55 },
  high: { label: "Высокая", factor: 1.725 },
  athlete: { label: "Очень высокая", factor: 1.9 },
};

const GOAL = {
  lose: { label: "Похудение", factor: 0.85 },
  maintain: { label: "Поддержание", factor: 1 },
  gain: { label: "Набор массы", factor: 1.12 },
};

function cmToIn(cm) {
  return cm / 2.54;
}

/** Оценка % жира по методу ВМС США (опционально для отображения). */
export function estimateBodyFat(profile) {
  const { sex, heightCm, neckCm, waistCm, hipsCm } = profile;
  if (!heightCm || !neckCm || !waistCm) return null;

  const height = cmToIn(heightCm);
  const neck = cmToIn(neckCm);
  const waist = cmToIn(waistCm);

  if (sex === "male") {
    if (waist <= neck) return null;
    const bf =
      86.01 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
    return clamp(bf, 3, 60);
  }

  const hips = cmToIn(hipsCm || waistCm);
  if (waist + hips <= neck) return null;
  const bf =
    163.205 * Math.log10(waist + hips - neck) -
    97.684 * Math.log10(height) -
    78.387;
  return clamp(bf, 8, 65);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function bmrMifflin(profile) {
  const { sex, weightKg, heightCm, age } = profile;
  if (!weightKg || !heightCm || !age) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function computeTargets(profile) {
  const bmr = bmrMifflin(profile);
  if (!bmr) return null;

  const activity = ACTIVITY[profile.activity] || ACTIVITY.moderate;
  const goal = GOAL[profile.goal] || GOAL.maintain;
  const tdee = bmr * activity.factor;
  const calories = Math.round(tdee * goal.factor);

  const proteinG = Math.round(weightProtein(profile.weightKg));
  const proteinKcal = proteinG * 4;
  const fatKcal = calories * 0.28;
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  const bodyFat = estimateBodyFat(profile);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    protein: proteinG,
    fat: fatG,
    carbs: carbsG,
    bodyFat: bodyFat != null ? Math.round(bodyFat * 10) / 10 : null,
    activityLabel: activity.label,
    goalLabel: goal.label,
  };
}

function weightProtein(weightKg) {
  return clamp(weightKg * 1.8, 50, 250);
}

export { ACTIVITY, GOAL };
