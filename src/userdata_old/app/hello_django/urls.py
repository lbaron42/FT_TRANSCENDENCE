"""
URL configuration for hello_django project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.views import LoginView, LogoutView


from upload.views import image_upload, example_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", image_upload, name="upload"),
    path('user-api/', include('users.urls')),
    #path("user-api/login/", LoginView.as_view(template_name="registration/login.html"), name="login"),
    #path("user-api/logout/", LogoutView.as_view(next_page="/"), name="logout"),
    path("user-api/example", example_view, name="example"),
]

if bool(settings.DEBUG):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)