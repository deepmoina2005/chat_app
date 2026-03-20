import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Shield, Calendar, Camera, Loader2, User as UserIcon, Phone, FileText, Check } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/utils";
import { setUser } from "@/store/slices/authSlice";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [about, setAbout] = useState(user?.about || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhoneNumber(user.phoneNumber || "");
      setAbout(user.about || "");
    }
  }, [user]);

  const handleUpdateProfile = async (field: string) => {
    setIsUpdating(true);
    try {
      const res = await axios.patch(`${API_URL}/user/profile`, { 
        name, 
        phoneNumber, 
        about 
      }, { withCredentials: true });
      dispatch(setUser(res.data));
      toast.success(`${field} updated successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(`${API_URL}/user/profile-picture`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(setUser(res.data));
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your public identity and account details</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar */}
        <Card className="lg:col-span-1 border-border bg-card/50 backdrop-blur-xl h-fit">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-40 h-40 border-4 border-primary/10 shadow-2xl">
                <AvatarImage src={user?.image} />
                <AvatarFallback className="text-4xl">
                  {user?.name?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed border-2 border-dashed border-white/50"
              >
                {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Camera className="w-8 h-8 text-white" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>
            <h2 className="text-2xl font-bold mt-6 text-center">{user?.name}</h2>
            <div className="mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Online
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" /> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Name</label>
                <div className="flex gap-2">
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="bg-background/50 border-border"
                    placeholder="Enter your name"
                  />
                  <Button size="sm" onClick={() => handleUpdateProfile("Name")} disabled={isUpdating || name === user?.name}>
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      className="pl-10 bg-background/50 border-border"
                      placeholder="+91 98765-43210"
                    />
                  </div>
                  <Button size="sm" onClick={() => handleUpdateProfile("Phone")} disabled={isUpdating || phoneNumber === user?.phoneNumber}>
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* About */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About / Status</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <textarea 
                      value={about} 
                      onChange={(e) => setAbout(e.target.value)} 
                      className="w-full min-h-[80px] p-3 pl-10 bg-background/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Hey there! I am using this chat app."
                    />
                  </div>
                  <Button size="sm" className="h-fit py-4" onClick={() => handleUpdateProfile("Status")} disabled={isUpdating || about === user?.about}>
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Account Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/30 border border-border/50">
                <span className="text-sm text-muted-foreground flex items-center font-medium">
                   <Mail className="w-4 h-4 mr-2" /> Email Address
                </span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/30 border border-border/50">
                <span className="text-sm text-muted-foreground flex items-center font-medium">
                  <Calendar className="w-4 h-4 mr-2" /> Member Since
                </span>
                <span className="text-sm font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
