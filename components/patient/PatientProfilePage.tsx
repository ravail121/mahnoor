"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  PATIENT_PROFILE_UPDATED,
  type PatientProfile,
} from "@/components/patient/PatientShell";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function initialFromName(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function PatientProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/me");
      const payload = (await response.json()) as
        | ApiSuccess<PatientProfile>
        | ApiFailure;
      const data = parsePayload(payload);
      setProfile(data);
      setName(data.name);
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setAge(data.age == null ? "" : String(data.age));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load profile",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          age: age === "" ? null : Number(age),
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<PatientProfile>
        | ApiFailure;
      const data = parsePayload(payload);
      setProfile(data);
      setNotice("Your details were saved.");
      window.dispatchEvent(new Event(PATIENT_PROFILE_UPDATED));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save profile",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setNotice("");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/me/avatar", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ avatar_url: string | null; name: string }>
        | ApiFailure;
      const data = parsePayload(payload);
      setProfile((current) =>
        current ? { ...current, avatar_url: data.avatar_url } : current,
      );
      setNotice("Photo updated.");
      window.dispatchEvent(new Event(PATIENT_PROFILE_UPDATED));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload photo",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Account</div>
        <h1>Profile</h1>
        <p>Update your details and photo. These appear on your bookings.</p>
      </div>

      {notice ? <div className="pt-notice ok">{notice}</div> : null}
      {error ? <div className="pt-notice err">{error}</div> : null}

      {loading ? (
        <div className="pt-loading">Loading your profile...</div>
      ) : (
        <div className="pt-profile-grid">
          <div className="pt-card pt-photo-card">
            <div className="pt-photo-preview">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.name} />
              ) : (
                <span>{initialFromName(name || "P")}</span>
              )}
            </div>
            <h2>Profile photo</h2>
            <p>JPG, PNG, or WebP. Up to 2 MB.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="pt-btn"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
          </div>

          <form className="pt-card pt-form" onSubmit={(event) => void saveProfile(event)}>
            <h2>Your information</h2>
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              Phone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Age
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </label>
            <button type="submit" className="pt-btn" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
