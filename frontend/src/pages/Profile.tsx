import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, apiPatch } from "@/lib/api";
import { useMe } from "@/lib/session";
import { DISCLAIMER, PRIVACY_NOTICE, type ProfileUpdate, type User } from "@/lib/types";

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setBirthYear(me.birth_year ? String(me.birth_year) : "");
    setBloodType(me.blood_type ?? "");
    setConditions(me.chronic_conditions ?? "");
    setAllergies(me.allergies ?? "");
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: (payload: ProfileUpdate) => apiPatch<User>("/auth/me", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profil güncellendi");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Profil kaydedilemedi")),
  });

  return (
    <AppShell title="Profil">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Ad Soyad</Label>
            <Input
              id="profile-name"
              value={name}
              data-testid="profile-name-input"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-birth-year">Doğum Yılı</Label>
              <Input
                id="profile-birth-year"
                inputMode="numeric"
                value={birthYear}
                data-testid="profile-birth-year-input"
                onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-blood-type">Kan Grubu</Label>
              <Input
                id="profile-blood-type"
                value={bloodType}
                placeholder="Örn: A Rh+"
                data-testid="profile-blood-type-input"
                onChange={(e) => setBloodType(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-conditions">Kronik Durumlar</Label>
            <Textarea
              id="profile-conditions"
              rows={2}
              value={conditions}
              data-testid="profile-conditions-input"
              onChange={(e) => setConditions(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-allergies">Bilinen Alerjiler</Label>
            <Textarea
              id="profile-allergies"
              rows={2}
              value={allergies}
              data-testid="profile-allergies-input"
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>

          <Button
            data-testid="profile-save-button"
            disabled={saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                name: name.trim() || undefined,
                birth_year: birthYear ? Number(birthYear) : undefined,
                blood_type: bloodType.trim() || undefined,
                chronic_conditions: conditions.trim() || undefined,
                allergies: allergies.trim() || undefined,
              })
            }
          >
            Kaydet
          </Button>
        </div>

        <div className="mt-10 space-y-3">
          <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
            {PRIVACY_NOTICE}
          </p>
          <p
            data-testid="profile-disclaimer"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800"
          >
            {DISCLAIMER}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
