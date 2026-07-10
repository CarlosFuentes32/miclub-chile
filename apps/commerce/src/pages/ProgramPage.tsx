import { useState } from "react";
import { LoyaltyProgramWizard } from "../components/LoyaltyProgramWizard";
import { ProgramSummaryCard } from "../components/ProgramSummaryCard";
import { commerceService } from "../services/commerce.service";
import { LoyaltyProgram, LoyaltyProgramDraft } from "../types/commerce";
export function ProgramPage({
  initial,
  onChange,
}: {
  initial: LoyaltyProgram | null;
  onChange: (p: LoyaltyProgram) => void;
}) {
  const [program, setProgram] = useState(initial),
    [wizard, setWizard] = useState(!initial),
    [editing, setEditing] = useState(false);
  async function create(draft: LoyaltyProgramDraft) {
    const p =
      editing && program
        ? await commerceService.updateLoyaltyProgram({ ...program, ...draft })
        : await commerceService.createLoyaltyProgram(draft);
    setProgram(p);
    onChange(p);
    setEditing(false);
    setWizard(false);
  }
  return (
    <div className="page">
      <p className="eyebrow">Motor de fidelización</p>
      <h1 className="title">Programa</h1>
      <p className="subtitle">
        Configura una experiencia válida para cualquier tipo de comercio.
      </p>
      {wizard ? (
        <div className="mt-7">
          <LoyaltyProgramWizard
            onCreate={create}
            initialDraft={editing && program ? program : undefined}
            submitLabel={editing ? "Guardar cambios" : "Crear programa"}
          />
        </div>
      ) : (
        program && (
          <div className="mt-7 max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Programa activo</h2>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(true); setWizard(true); }} className="secondary">
                  Editar programa
                </button>
                <button onClick={() => { setEditing(false); setWizard(true); }} className="secondary">
                  Crear nuevo programa
                </button>
              </div>
            </div>
            <ProgramSummaryCard program={program} />
          </div>
        )
      )}
    </div>
  );
}
