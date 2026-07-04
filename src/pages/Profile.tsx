import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { students } from '../data';
import { ArrowLeft, Edit2, X, Trash2, Mail, BookOpen, GraduationCap, Image as ImageIcon, Plus, Instagram, Ghost } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import Cropper from 'react-easy-crop';
import { DEVELOPER_EMAILS } from '../constants';

interface Photo {
  id: string;
  studentId: number;
  imageUrl: string;
  createdAt: number;
  ownerUid: string;
}

const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
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

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  maxWidth = 400,
  quality = 0.8
): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  let width = pixelCrop.width;
  let height = pixelCrop.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL('image/jpeg', quality);
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const student = students.find((s) => s.id === Number(id));
  const { user } = useAuth();
  const isDeveloper = DEVELOPER_EMAILS.includes(user?.email || '');
  const { isEditingDisabled } = useSettings();

  useEffect(() => {
    if (isEditingDisabled) {
      setIsEditing(false);
    }
  }, [isEditingDisabled]);

  const [images, setImages] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [profileData, setProfileData] = useState({
    name: student?.name || '',
    username: student?.username || '',
    rollNumber: student?.rollNumber || '',
    bio: student?.bio || '',
    imageUrl: student?.imageUrl || '',
    graduationYear: student?.graduationYear || 2024,
    instagram: (student as any)?.instagram || '',
    snapchat: (student as any)?.snapchat || '',
    tc: (student as any)?.tc || false,
    ownerUid: '' as string | undefined,
  });

  const [error, setError] = useState<string | null>(null);

  // Load profile data from Firestore via backend caching API
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setProfileData({
              name: data.name,
              username: data.username,
              rollNumber: data.rollNumber,
              bio: data.bio || '',
              imageUrl: data.imageUrl || student?.imageUrl || '',
              graduationYear: data.graduationYear || student?.graduationYear || 2024,
              instagram: data.instagram || '',
              snapchat: data.snapchat || '',
              tc: data.tc || false,
              ownerUid: data.ownerUid,
            });
          }
        }
        setError(null);
      } catch (err: any) {
        setError('Failed to load profile. Please try again later.');
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, [id, student]);

  // Load photos from Firestore via backend caching API
  useEffect(() => {
    if (!id) return;

    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/photos?studentId=${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }
        const loadedPhotos: Photo[] = await response.json();
        
        // If no photos and we have a mock student, show mock photos
        if (loadedPhotos.length === 0 && student) {
          setImages(Array.from({ length: 9 }, (_, i) => ({
            id: `dummy-${i}`,
            studentId: student.id,
            imageUrl: `https://picsum.photos/seed/${student.username}_post${i}/400/400`,
            createdAt: Date.now() - i * 1000,
            ownerUid: 'dummy'
          })));
        } else {
          setImages(loadedPhotos);
        }
        setError(null);
      } catch (err: any) {
        setError('Failed to load photos. Please try again later.');
        console.error("Error fetching photos:", err);
      }
    };
    fetchPhotos();
  }, [id, student]);

  if (!student) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Student not found</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 font-semibold">Back to Directory</button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(`/class/${profileData.graduationYear}`)} 
          className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Class of {profileData.graduationYear}{profileData.graduationYear === 2024 ? '-27' : ''}
        </button>
        <div className="text-center py-20 bg-white rounded-2xl border border-red-100 shadow-sm">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditingDisabled && !isDeveloper) {
      alert("Editing is currently disabled.");
      return;
    }
    const file = e.target.files?.[0];
    if (file && user && id) {
      try {
        const base64String = await compressImage(file, 1000, 0.8);
        const photoId = Date.now().toString();
        const newPhoto: Photo = {
          id: photoId,
          studentId: Number(id),
          imageUrl: base64String,
          createdAt: Date.now(),
          ownerUid: user.uid
        };
        const response = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPhoto)
        });
        if (response.ok) {
          setImages(prev => [newPhoto, ...prev.filter(img => !img.id.startsWith('dummy'))]);
        } else {
          throw new Error('Photo upload failed on server');
        }
      } catch (error) {
        console.error("Image upload error:", error);
        alert("Failed to upload image. Please try a different image.");
      }
    } else if (!user) {
      alert("Please sign in to upload photos.");
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditingDisabled && !isDeveloper) {
      alert("Editing is currently disabled.");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setCropModalOpen(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
    if (profilePicInputRef.current) {
      profilePicInputRef.current.value = '';
    }
  };

  const onCropComplete = React.useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (isEditingDisabled && !isDeveloper) {
      alert("Editing is currently disabled.");
      return;
    }
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels, 400, 0.8);
      setProfileData(prev => ({ ...prev, imageUrl: croppedImageBase64 }));
      setCropModalOpen(false);
      setCropImageSrc(null);
    } catch (error) {
      console.error("Profile pic crop error:", error);
      alert("Failed to process profile picture. Please try a different image.");
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isEditingDisabled && !isDeveloper) return;
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    if (isEditingDisabled && !isDeveloper) {
      alert("Editing is currently disabled.");
      return;
    }
    if (!user || !id) {
      alert("Please sign in to save your profile.");
      return;
    }
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(id),
          name: profileData.name,
          username: profileData.username,
          rollNumber: profileData.rollNumber,
          bio: profileData.bio,
          imageUrl: profileData.imageUrl,
          graduationYear: Number(profileData.graduationYear),
          instagram: profileData.instagram || '',
          snapchat: profileData.snapchat || '',
          tc: !!profileData.tc,
          ownerUid: user.uid
        })
      });
      if (response.ok) {
        setIsEditing(false);
      } else {
        throw new Error('Save profile failed on server');
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save profile. Please ensure all fields are valid and the image is not too large.");
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (isEditingDisabled && !isDeveloper) {
      alert("Editing is currently disabled.");
      return;
    }
    if (!user) return;
    if (photo.ownerUid !== user.uid && !isDeveloper) {
      alert("You can only delete your own photos.");
      return;
    }
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setImages(prev => prev.filter(p => p.id !== photo.id));
      } else {
        throw new Error('Delete photo failed on server');
      }
    } catch (error) {
      console.error("Delete photo error:", error);
      alert("Failed to delete photo.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(`/class/${profileData.graduationYear}`)} 
        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Class of {profileData.graduationYear}{profileData.graduationYear === 2024 ? '-27' : ''}
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        
        {/* Profile Content */}
        <div className={`px-6 sm:px-10 pb-10 relative ${profileData.tc && !isEditing ? 'blur-sm select-none' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-20 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                <img 
                  src={profileData.imageUrl || `https://picsum.photos/seed/${profileData.username}/400/400`} 
                  alt={profileData.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              {isEditing && (
                <div 
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer border-4 border-transparent"
                  onClick={() => profilePicInputRef.current?.click()}
                >
                  <span className="text-white text-sm font-semibold">Change</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={profilePicInputRef}
                onChange={handleProfilePicUpload}
              />
            </div>
            
            <div className="mt-4 sm:mt-0 sm:ml-6 flex-grow flex justify-between items-end">
              {!isEditing && (
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{profileData.name}</h1>
                  <p className="text-lg text-slate-500 font-medium">@{profileData.username}</p>
                </div>
              )}
              {!isEditing && (!isEditingDisabled || isDeveloper) && (user?.uid === profileData.ownerUid || isDeveloper) && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={profileData.name} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    name="username" 
                    value={profileData.username} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                  <input 
                    type="text" 
                    name="rollNumber" 
                    value={profileData.rollNumber} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full font-mono focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Graduation Year</label>
                  <input 
                    type="number" 
                    name="graduationYear" 
                    value={profileData.graduationYear} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                  <input 
                    type="text" 
                    name="instagram" 
                    value={profileData.instagram} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Snapchat</label>
                  <input 
                    type="text" 
                    name="snapchat" 
                    value={profileData.snapchat} 
                    onChange={handleProfileChange} 
                    className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                {isDeveloper && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="tc"
                      checked={profileData.tc}
                      onChange={(e) => setProfileData(prev => ({ ...prev, tc: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                    />
                    <label className="text-sm font-medium text-slate-700">Mark as Transfer Certificate (TC)</label>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio / About</label>
                <textarea 
                  name="bio" 
                  value={profileData.bio} 
                  onChange={handleProfileChange} 
                  className="border border-slate-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none" 
                  rows={4} 
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={saveProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors">
                  Save Changes
                </button>
                <button onClick={() => {
                  setProfileData({
                    name: student.name,
                    username: student.username,
                    rollNumber: student.rollNumber,
                    bio: student.bio,
                    imageUrl: student.imageUrl,
                    graduationYear: student.graduationYear,
                  });
                  setIsEditing(false);
                }} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-6 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-indigo-500" />
                    About
                  </h3>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {profileData.bio || "No bio provided yet."}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-indigo-500" />
                      Gallery
                    </h3>
                    <div className="flex space-x-3">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                      {!isEditingDisabled && (user?.uid === profileData.ownerUid || isDeveloper) && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Photo
                        </button>
                      )}
                      {images.length > 0 && !isEditingDisabled && (user?.uid === profileData.ownerUid || isDeveloper) && (
                        <button 
                          onClick={() => setIsDeleting(!isDeleting)}
                          className={`text-sm font-medium transition-colors flex items-center ${isDeleting ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> {isDeleting ? 'Done' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {images.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                      <p className="text-slate-500">No photos uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {images.map((photo, index) => (
                        <div 
                          key={photo.id} 
                          className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200 ${isDeleting ? 'animate-pulse ring-2 ring-red-500' : ''}`} 
                          onClick={() => {
                            if (isDeleting) {
                              deletePhoto(photo);
                            } else {
                              setSelectedImage(photo.imageUrl);
                            }
                          }}
                        >
                          <img src={photo.imageUrl} alt={`Gallery ${index + 1}`} className={`w-full h-full object-cover transition-transform duration-500 ${!isDeleting && 'group-hover:scale-110'} ${isDeleting ? 'opacity-50' : ''}`} referrerPolicy="no-referrer" />
                          {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-red-500 rounded-full p-2 shadow-lg">
                                <Trash2 className="text-white w-5 h-5" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Academic Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Roll Number</p>
                      <p className="font-mono text-slate-800 bg-white px-3 py-2 rounded border border-slate-200">{profileData.rollNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Program</p>
                      <p className="text-slate-800 font-medium flex items-center">
                        <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
                        BSc Hons Chemistry
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Class Of</p>
                      <p className="text-slate-800 font-medium">{profileData.graduationYear}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Socials</h3>
                  <div className="space-y-4">
                    {profileData.instagram && (
                      <a href={profileData.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-indigo-600 hover:text-indigo-800">
                        <Instagram size={20} />
                        <span className="text-sm">Instagram</span>
                      </a>
                    )}
                    {profileData.snapchat && (
                      <a href={profileData.snapchat} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-indigo-600 hover:text-indigo-800">
                        <Ghost size={20} />
                        <span className="text-sm">Snapchat</span>
                      </a>
                    )}
                    {!profileData.instagram && !profileData.snapchat && (
                      <p className="text-sm text-slate-500">No social links added.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full screen view" 
            className="max-w-full max-h-full object-contain" 
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Crop Modal */}
      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col h-[80vh] max-h-[600px]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">Crop Profile Picture</h3>
              <button onClick={() => setCropModalOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative flex-grow bg-black">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center mb-4">
                <span className="text-sm text-slate-500 mr-3">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setCropModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleCropSave} className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
