import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { HomeComponent } from './pages/home.component';
import { UsersComponent } from './pages/users.component';
import { CurriculumsComponent } from './pages/curriculums.component';
import { LessonsComponent } from './pages/lessons.component';
import { LessonDetailComponent } from './pages/lesson-detail.component';
import { PresentComponent } from './pages/present.component';
import { ClassesComponent } from './pages/classes.component';
import { AssignmentsComponent } from './pages/assignments.component';
import { GradingComponent } from './pages/grading.component';
import { TeacherDashboardComponent } from './pages/teacher-dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard.component';
import { MyAssignmentsComponent } from './pages/my-assignments.component';
import { DoAssignmentComponent } from './pages/do-assignment.component';
import { MyResultsComponent } from './pages/my-results.component';
import { StudentLearnComponent } from './pages/student-learn.component';
import { StudentLessonComponent } from './pages/student-lesson.component';
import { MyClassComponent } from './pages/my-class.component';
import { authGuard, roleGuard, homeForRole } from './auth.guard';
import { AuthService } from './auth.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => {
      const auth = inject(AuthService);
      return auth.isLoggedIn() ? inject(Router).parseUrl(homeForRole(auth.user()?.role)) : '/login';
    }
  },
  { path: 'login', component: LoginComponent },

  // ── Chỉ quản trị ──
  { path: 'admin', component: AdminDashboardComponent, canActivate: [roleGuard(['Admin'])] },
  { path: 'users', component: UsersComponent, canActivate: [roleGuard(['Admin'])] },

  // ── Giáo viên + Quản trị ──
  { path: 'dashboard', component: TeacherDashboardComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'curriculums', component: CurriculumsComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'curriculums/:id/lessons', component: LessonsComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'lessons/:id', component: LessonDetailComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'present/:id', component: PresentComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'classes', component: ClassesComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'assignments', component: AssignmentsComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },
  { path: 'grading', component: GradingComponent, canActivate: [roleGuard(['Teacher', 'Admin'])] },

  // ── Học viên (giáo viên vẫn xem được — "mọi quyền của học viên") ──
  { path: 'home', component: HomeComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'my-class/:id', component: MyClassComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'learn', component: StudentLearnComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'learn/:id', component: StudentLessonComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'my-assignments', component: MyAssignmentsComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'do/:id', component: DoAssignmentComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] },
  { path: 'results', component: MyResultsComponent, canActivate: [roleGuard(['Student', 'Teacher', 'Admin'])] }
];
