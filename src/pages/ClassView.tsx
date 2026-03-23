import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/error';
import { ArrowLeft, UserPlus, Image as ImageIcon } from 'lucide-react';
import { students as mockStudents } from '../data';

const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface StudentProfile {
  id: number;
  name: string;
  username: string;
  rollNumber: string;
  bio: string;
  imageUrl: string;
  graduationYear: number;
  ownerUid: string;
}

export default function ClassView() {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!year) return;
    const yearNum = parseInt(year);

    // Fetch class info
    const classUnsubscribe = onSnapshot(doc(db, 'classes', year), (docSnap) => {
      if (docSnap.exists()) {
        setClassInfo(docSnap.data());
      }
    });

    const q = query(collection(db, 'profiles'), where('graduationYear', '==', yearNum));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedStudents: StudentProfile[] = [];
      snapshot.forEach((doc) => {
        loadedStudents.push(doc.data() as StudentProfile);
      });

      // Merge with mock data for demonstration if empty or missing
      const mockClassStudents = mockStudents.filter(s => s.graduationYear === yearNum);
      
      const mergedStudents = [...loadedStudents];
      mockClassStudents.forEach(mockStudent => {
        if (!mergedStudents.find(s => s.id === mockStudent.id)) {
          mergedStudents.push({
            ...mockStudent,
            ownerUid: 'mock'
          });
        }
      });

      mergedStudents.sort((a, b) => a.id - b.id);
      setStudents(mergedStudents);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'profiles', auth);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      classUnsubscribe();
    };
  }, [year]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user && year) {
      try {
        const base64String = await compressImage(file, 1920, 0.8);
        if (classInfo) {
          await updateDoc(doc(db, 'classes', year), {
            imageUrl: base64String
          });
        } else {
          await setDoc(doc(db, 'classes', year), {
            year: parseInt(year),
            title: `Class of ${year}`,
            createdAt: Date.now(),
            imageUrl: base64String
          });
        }
      } catch (error) {
        console.error("Cover upload error:", error);
        alert("Failed to upload cover image. Please try a different image.");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Loading directory...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {classInfo?.imageUrl && (
        <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-8 relative group">
          <img src={classInfo.imageUrl} alt={`Class of ${year}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
          {user && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center shadow-sm transition-colors opacity-0 group-hover:opacity-100"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Change Cover
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')} 
            className="mr-4 p-2 hover:bg-slate-200 rounded-full transition-colors"
            aria-label="Back to Classes"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Class of {year}
            </h1>
            <p className="text-lg text-slate-600 mt-1">
              Student Directory
            </p>
          </div>
        </div>
        
        {!classInfo?.imageUrl && user && (
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleCoverUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Cover Photo
            </button>
          </div>
        )}
        {classInfo?.imageUrl && user && (
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleCoverUpload}
          />
        )}
      </div>

      {students.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No students found for this class yet.</h2>
          <p className="text-slate-500">Be the first to create a profile!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {students.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            >
              <Link to={`/student/${student.id}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-slate-100">
                <div className="relative aspect-square overflow-hidden bg-slate-200">
                  <img
                    src={student.imageUrl || `https://picsum.photos/seed/${student.username}/400/400`}
                    alt={student.name}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {student.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-1 truncate">{student.rollNumber}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
