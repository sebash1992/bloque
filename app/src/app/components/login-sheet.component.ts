import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../data/auth.service';

@Component({
  selector: 'app-login-sheet',
  standalone: true,
  imports: [CommonModule, IonModal],
  templateUrl: './login-sheet.component.html',
  styleUrls: ['./login-sheet.component.scss'],
})
export class LoginSheetComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);

  loading = false;

  async google() {
    this.loading = true;
    try {
      await this.auth.signInWithGoogle();
    } catch {
      await this.toast('No se pudo iniciar sesión con Google.');
    } finally {
      this.loading = false;
    }
  }

  async apple() {
    if (!this.auth.appleAvailable) {
      await this.toast('Entrá con Apple desde la app de iPhone.');
      return;
    }
    this.loading = true;
    try {
      await this.auth.signInWithApple();
    } catch {
      await this.toast('No se pudo iniciar sesión con Apple.');
    } finally {
      this.loading = false;
    }
  }

  close() {
    this.closed.emit();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      color: 'medium',
    });
    await t.present();
  }
}
