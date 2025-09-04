'use client';

import { ArrowRight, Book, CheckCircle, FileText, GitBranch, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const ONBOARDING_STEPS = [
  {
    icon: GitBranch,
    title: 'Connectez votre dépôt GitHub',
    description: 'Importez automatiquement vos dépôts depuis GitHub',
  },
  {
    icon: Sparkles,
    title: 'Générez la documentation',
    description: "L'IA analyse votre code et crée une documentation complète",
  },
  {
    icon: Book,
    title: 'Explorez votre cours',
    description: 'Naviguez dans votre documentation interactive avec tutoriels',
  },
  {
    icon: FileText,
    title: 'Partagez et collaborez',
    description: 'Exportez ou partagez votre documentation avec votre équipe',
  },
];

export function OnboardingModal({ isOpen, onClose, userName }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('hasSeenOnboarding');
    if (seen) {
      setHasSeenOnboarding(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Don't show if already seen
  if (hasSeenOnboarding && !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {userName ? `Bienvenue, ${userName}!` : 'Bienvenue sur Fondation!'} 🎉
          </DialogTitle>
          <DialogDescription>
            Découvrez comment générer une documentation IA pour vos projets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          <div className="flex justify-between mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-primary/10">
                {(() => {
                  const step = ONBOARDING_STEPS[currentStep];
                  if (!step) {
                    return null;
                  }
                  const Icon = step.icon;
                  return <Icon className="h-6 w-6 text-primary" />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Étape {currentStep + 1}: {ONBOARDING_STEPS[currentStep]?.title}
                </h3>
                <p className="text-muted-foreground">
                  {ONBOARDING_STEPS[currentStep]?.description}
                </p>
              </div>
            </div>
          </Card>

          {/* Sample repositories for first-time users */}
          {currentStep === 0 && (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm font-medium mb-3">Essayez avec ces dépôts exemples:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">facebook/react</span>
                  <Button size="sm" variant="outline">
                    Essayer
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">vercel/next.js</span>
                  <Button size="sm" variant="outline">
                    Essayer
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Completed steps */}
          {currentStep === ONBOARDING_STEPS.length - 1 && (
            <div className="space-y-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Passer
            </Button>
            <Button onClick={handleNext}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? (
                <>
                  Commencer
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
