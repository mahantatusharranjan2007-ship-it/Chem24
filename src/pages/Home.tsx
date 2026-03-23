import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/error';
import { Plus, GraduationCap } from 'lucide-react';

interface ClassGroup {
  year: number;
  title: string;
  createdAt: number;
  imageUrl?: string;
}

export default function Home() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newYear, setNewYear] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const loadedClasses: ClassGroup[] = [];
      snapshot.forEach((doc) => {
        loadedClasses.push(doc.data() as ClassGroup);
      });
      // Default classes if empty
      if (loadedClasses.length === 0) {
        setClasses([
          { year: 2024, title: 'Class of 2024', createdAt: Date.now() },
          { year: 2025, title: 'Class of 2025', createdAt: Date.now() }
        ]);
      } else {
        loadedClasses.sort((a, b) => b.year - a.year);
        setClasses(loadedClasses);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes', auth);
    });
    return () => unsubscribe();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const yearNum = parseInt(newYear);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      alert("Please enter a valid year.");
      return;
    }

    try {
      await setDoc(doc(db, 'classes', yearNum.toString()), {
        year: yearNum,
        title: `Class of ${yearNum}`,
        createdAt: Date.now()
      });
      setIsAdding(false);
      setNewYear('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classes/${yearNum}`, auth);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center flex flex-col items-center">
        <img 
          src="https://dduniversity.ac.in/wp-content/uploads/2024/02/DD-Logo-2.png" 
          alt="Dharanidhar University Logo" 
          className="h-24 w-auto mb-6 drop-shadow-md"
          referrerPolicy="no-referrer"
        />
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
          Student Directory
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Dharanidhar University, Keonjhar
        </p>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Graduating Classes</h2>
        {user && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Class Year
          </button>
        )}
      </div>

      {isAdding && user && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8"
          onSubmit={handleAddClass}
        >
          <h3 className="text-lg font-semibold mb-4">Add New Class Year</h3>
          <div className="flex space-x-4">
            <input 
              type="number" 
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="e.g. 2026"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              Create
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls, index) => (
          <motion.div
            key={cls.year}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link 
              to={`/class/${cls.year}`} 
              className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-indigo-300 relative overflow-hidden h-48"
            >
              {cls.imageUrl ? (
                <div className="absolute inset-0 z-0">
                  <img src={cls.imageUrl} alt={cls.title} className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
              ) : (
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity z-0">
                  <GraduationCap className="w-24 h-24 text-indigo-600" />
                </div>
              )}
              <div className="relative z-10 h-full flex flex-col justify-end p-8">
                <h3 className={`text-3xl font-bold transition-colors mb-2 ${cls.imageUrl ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                  {cls.title}
                </h3>
                <p className={`font-medium ${cls.imageUrl ? 'text-slate-200' : 'text-slate-500'}`}>
                  View Students &rarr;
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
