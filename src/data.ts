export interface Student {
  id: number;
  rollNumber: string;
  username: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  graduationYear: number;
}

export const students: Student[] = Array.from({ length: 32 }, (_, i) => {
  const studentNumber = i + 1;
  const paddedNumber = String(studentNumber).padStart(3, '0');
  const rollNumber = `5301K24${paddedNumber}`;
  
  let name = `Student ${studentNumber}`;
  let username = `student_${studentNumber}`;
  let imageUrl = `https://picsum.photos/seed/chemistrystudent${studentNumber}/400/400`;

  if (studentNumber === 32) {
    name = 'Tushar Ranjan Mahanta';
    username = 'tushar.mahanta_32';
    imageUrl = 'https://picsum.photos/seed/tusharmahanta/400/400';
  }

  return {
    id: studentNumber,
    rollNumber,
    username,
    name,
    role: 'BSc Hons Chemistry',
    bio: 'BSc Hons Chemistry 🧪\nDharanidhar University 🎓\nClass of 2024 ✨',
    imageUrl,
    graduationYear: 2024,
  };
});
