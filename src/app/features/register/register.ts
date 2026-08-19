import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  CatalogService,
  ProfessionOption
} from '../../core/services/catalog.service';

import {
  PatientRegistrationPayload,
  RegistrationService,
  SpecialistRegistrationPayload
} from '../../core/services/registration.service';

import {
  MedicalServiceOption
} from '../../core/models/medical-service.model';
import {
  RegisterLocationMap,
  RegisterMapLocation
} from './register-location-map/register-location-map';

export type RegistrationType =
  'PACIENTE' | 'ESPECIALISTA';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RegisterLocationMap
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnInit {
  private readonly registrationService =
    inject(RegistrationService);

  private readonly catalogService =
    inject(CatalogService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);

  registrationType: RegistrationType =
    'PACIENTE';

  email = '';
  password = '';
  confirmPassword = '';

  firstName = '';
  lastName = '';
  dni = '';

  mobilePhone = '';
  landlinePhone = '';

  addressText = '';
  addressReference = '';

  latitude: number | null = null;
  longitude: number | null = null;

  bloodType = '';
  allergies = '';
  preexistingConditions = '';

  professionCode = '';
  collegeNumber = '';
  offeredServiceCodes: string[] = [];

  professions: ProfessionOption[] = [];
  services: MedicalServiceOption[] = [];

  loading = false;
  catalogLoading = false;

  errorMessage = '';
  successMessage = '';
  specialistStatus = '';

  ngOnInit(): void {
    const requestedType =
      this.route.snapshot.queryParamMap
        .get('type');

    if (
      requestedType === 'PACIENTE'
      || requestedType === 'ESPECIALISTA'
    ) {
      this.registrationType =
        requestedType;
    }

    this.loadCatalogs();
  }

  get isPatient(): boolean {
    return this.registrationType === 'PACIENTE';
  }

  get isSpecialist(): boolean {
    return this.registrationType === 'ESPECIALISTA';
  }

  get availableServices(): MedicalServiceOption[] {
    if (!this.professionCode) {
      return [];
    }

    return this.services.filter(
      (service) =>
        service.professionCode ===
        this.professionCode
    );
  }

  selectType(
    type: RegistrationType
  ): void {
    this.registrationType = type;
    this.errorMessage = '';
    this.successMessage = '';
    this.specialistStatus = '';

    if (type === 'PACIENTE') {
      this.professionCode = '';
      this.collegeNumber = '';
      this.offeredServiceCodes = [];
    }
  }

  onProfessionChange(): void {
    const validCodes =
      new Set(
        this.availableServices.map(
          (service) => service.code
        )
      );

    this.offeredServiceCodes =
      this.offeredServiceCodes.filter(
        (code) => validCodes.has(code)
      );
  }

  toggleService(
    serviceCode: string,
    checked: boolean
  ): void {
    if (checked) {
      if (
        !this.offeredServiceCodes.includes(
          serviceCode
        )
      ) {
        this.offeredServiceCodes = [
          ...this.offeredServiceCodes,
          serviceCode
        ];
      }

      return;
    }

    this.offeredServiceCodes =
      this.offeredServiceCodes.filter(
        (code) => code !== serviceCode
      );
  }

  isServiceSelected(
    serviceCode: string
  ): boolean {
    return this.offeredServiceCodes.includes(
      serviceCode
    );
  }

  onLocationChange(
    location: RegisterMapLocation
  ): void {

    this.latitude =
      location.latitude;

    this.longitude =
      location.longitude;

    this.errorMessage = '';
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.specialistStatus = '';

    const validation =
      this.validate();

    if (validation) {
      this.errorMessage = validation;
      return;
    }

    const common = {
      email:
        this.email.trim().toLowerCase(),

      password:
        this.password,

      firstName:
        this.firstName.trim(),

      lastName:
        this.lastName.trim(),

      dni:
        this.dni.trim(),

      mobilePhone:
        this.mobilePhone.trim(),

      landlinePhone:
        this.landlinePhone.trim(),

      addressText:
        this.addressText.trim(),

      addressReference:
        this.addressReference.trim(),

      latitude:
        this.latitude as number,

      longitude:
        this.longitude as number
    };

    this.loading = true;

    if (this.isPatient) {
      const payload:
        PatientRegistrationPayload = {
          ...common,
          bloodType:
            this.bloodType.trim(),
          allergies:
            this.allergies.trim(),
          preexistingConditions:
            this.preexistingConditions.trim()
        };

      this.registrationService
        .registerPatient(payload)
        .subscribe({
          next: (response) => {
            this.loading = false;

            this.successMessage =
              response.message
              || 'Paciente registrado correctamente.';

            this.changeDetectorRef
              .detectChanges();
          },
          error: (error: HttpErrorResponse) => {
            this.handleError(error);
          }
        });

      return;
    }

    const specialistPayload:
      SpecialistRegistrationPayload = {
        ...common,

        professionCode:
          this.professionCode,

        collegeNumber:
          this.collegeNumber.trim(),

        offeredServiceCodes:
          [...this.offeredServiceCodes]
      };

    this.registrationService
      .registerSpecialist(
        specialistPayload
      )
      .subscribe({
        next: (response) => {
          this.loading = false;

          this.specialistStatus =
            response.status;

          this.successMessage =
            response.message
            || 'Registro de especialista recibido correctamente.';

          this.changeDetectorRef
            .detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(
      ['/login']
    );
  }

  private loadCatalogs(): void {
    this.catalogLoading = true;

    let completed = 0;

    const finish = (): void => {
      completed++;

      if (completed >= 2) {
        this.catalogLoading = false;

        this.changeDetectorRef
          .detectChanges();
      }
    };

    this.catalogService
      .listProfessions()
      .subscribe({
        next: (items) => {
          this.professions = items;
          finish();
        },
        error: () => {
          this.errorMessage =
            'No se pudo cargar el catálogo de profesiones.';
          finish();
        }
      });

    this.catalogService
      .listServices()
      .subscribe({
        next: (items) => {
          this.services = items;
          finish();
        },
        error: () => {
          this.errorMessage =
            'No se pudo cargar el catálogo de servicios médicos.';
          finish();
        }
      });
  }

  private validate(): string {
    if (
      !this.email.trim()
      || !this.email.includes('@')
    ) {
      return 'Ingrese un correo electrónico válido.';
    }

    if (
      this.password.length < 8
      || this.password.length > 72
    ) {
      return 'La contraseña debe tener entre 8 y 72 caracteres.';
    }

    if (
      !/[a-z]/.test(this.password)
      || !/[A-Z]/.test(this.password)
      || !/[0-9]/.test(this.password)
    ) {
      return 'La contraseña debe contener mayúscula, minúscula y número.';
    }

    if (
      this.password !==
      this.confirmPassword
    ) {
      return 'Las contraseñas no coinciden.';
    }

    if (
      !this.firstName.trim()
      || !this.lastName.trim()
    ) {
      return 'Ingrese nombres y apellidos.';
    }

    if (
      !/^[0-9]{8}$/.test(
        this.dni.trim()
      )
    ) {
      return 'El DNI debe contener exactamente 8 dígitos.';
    }

    if (
      !this.mobilePhone.trim()
      && !this.landlinePhone.trim()
    ) {
      return 'Ingrese al menos un celular o teléfono.';
    }

    if (!this.addressText.trim()) {
      return 'Ingrese la dirección de residencia.';
    }
    if (!this.addressReference.trim()) {
      return 'Ingrese una referencia para ubicar su domicilio.';
    }

    if (
      this.latitude === null
      || this.longitude === null
    ) {
      return 'Seleccione su ubicación en el mapa o use su ubicación actual.';
    }

    if (
      this.latitude < -90
      || this.latitude > 90
      || this.longitude < -180
      || this.longitude > 180
    ) {
      return 'Las coordenadas ingresadas no son válidas.';
    }

    if (this.isSpecialist) {
      if (!this.professionCode) {
        return 'Seleccione su profesión.';
      }

      if (!this.collegeNumber.trim()) {
        return 'Ingrese su número de colegiatura.';
      }

      if (
        this.offeredServiceCodes.length === 0
      ) {
        return 'Seleccione al menos un servicio profesional.';
      }
    }

    return '';
  }

  private handleError(
    error: HttpErrorResponse
  ): void {
    this.loading = false;

    const detail =
      error.error?.detail
      ?? error.error?.message;

    if (
      typeof detail === 'string'
      && detail.trim()
    ) {
      this.errorMessage =
        detail;
    }
    else if (
      error.status === 409
    ) {
      this.errorMessage =
        'El correo o DNI ya se encuentra registrado.';
    }
    else if (
      error.status === 400
    ) {
      this.errorMessage =
        'Revise los datos ingresados.';
    }
    else {
      this.errorMessage =
        'No se pudo completar el registro. Intente nuevamente.';
    }

    this.changeDetectorRef
      .detectChanges();
  }
}