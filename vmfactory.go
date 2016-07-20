package main

import (
	"os"
	"fmt"
	"time"
	"strconv"
	"net/http"
	"io/ioutil"
	"encoding/json"
	"container/list"

	"github.com/rackspace/gophercloud"
	"github.com/rackspace/gophercloud/openstack"
	"github.com/rackspace/gophercloud/pagination"

	"github.com/rackspace/gophercloud/openstack/compute/v2/images"
	"github.com/rackspace/gophercloud/openstack/compute/v2/servers"
	"github.com/rackspace/gophercloud/openstack/compute/v2/flavors"
	"github.com/rackspace/gophercloud/openstack/compute/v2/extensions/keypairs"
	"github.com/rackspace/gophercloud/openstack/compute/v2/extensions/secgroups"
	"github.com/rackspace/gophercloud/openstack/compute/v2/extensions/volumeattach"
	"github.com/rackspace/gophercloud/openstack/compute/v2/extensions/bootfromvolume"

	"github.com/rackspace/gophercloud/openstack/identity/v2/tenants"

	"github.com/rackspace/gophercloud/openstack/blockstorage/v2/volumes"
	"github.com/rackspace/gophercloud/openstack/blockstorage/v1/volumetypes"

	"github.com/rackspace/gophercloud/openstack/networking/v2/networks"

	"github.com/gorilla/mux"
//	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
)

type ZoneState struct {
	Available   bool		`json:"available"`
}
type AvailableZone struct {
	ZoneState	ZoneState	`json:"zoneState"`
	Hosts		string		`json:"hosts"`
	ZoneName	string		`json:"zoneName"`
}

type AvailableZoneList struct {
	AvailabilityZoneInfo	[]AvailableZone `json:"availabilityZoneInfo"`
}


var openstack_url	string
var apppath		string

var store = sessions.NewCookieStore([]byte("something-very-secret"))

func main() {

	openstack_url = os.Getenv("OPENSTACK")
	apppath = os.Getenv("APPNAME")

	if apppath == "" {
		apppath = "/"
	} else {
		apppath = "/"+apppath+"/"
	}

	mainurlparser := map[string]interface{} {
		"/"				: defaultProcessor,
		"/login/"			: loginProcessor,
		"/logout/"			: logoutProcessor,
		"/tenantlist/"			: tenantlistProcessor,
		}
	tenanturlparser := map[string]interface{} {
		"/vmlist/"			: vmlistProcessor,
		"/volumelist/"			: volumelistProcessor,
		"/flavorlist/"			: flavorlistProcessor,
		"/secgrouplist/"		: secgrouplistProcessor,
		"/imagelist/"			: imagelistProcessor,
		"/keypairlist/"			: keypairlistProcessor,
		"/osavailabilityzonelist/"	: osavailabilityzonelistProcessor,
		"/volumeavailabilityzonelist/"	: volumeavailabilityzonelistProcessor,
		"/volumetypelist/"		: volumetypelistProcessor,
		"/networklist/{tenantid}/"	: networklistProcessor,
		"/createvolumes/{vmid}/"	: createvolumesProcessor,
		"/createvm/"			: createvmProcessor,
		"/vminfo/{vmid}/"		: vminfoProcessor,
	}

	// Regist all url handlers in urlparser

	r := mux.NewRouter()
	r.PathPrefix(apppath+"static/").Handler(http.StripPrefix(apppath+"static/", http.FileServer(http.Dir("templates"))))
	s := r.PathPrefix(apppath).Subrouter()
	for mainurl, handler := range mainurlparser {
		s.HandleFunc(mainurl, handler.(func(http.ResponseWriter, *http.Request)))
	}
//	p := s.PathPrefix("/{tenantname}/").Subrouter()
	for tenanturl, handler := range tenanturlparser {
		s.HandleFunc("/{tenantname}"+tenanturl, handler.(func(http.ResponseWriter, *http.Request)))
	}
	//fs := http.FileServer(http.Dir("templates"))

	//http.Handle(apppath+"static/", http.StripPrefix(apppath+"static/", fs))

	// If you want to serve without gorilla mux, use context to prevent memory leak
	//http.ListenAndServe(":3000", context.ClearHandler(http.DefaultServeMux))
	//http.Handle("/", r)
	//http.ListenAndServe(":4000", nil)
	//http.ListenAndServe(":3000", context.ClearHandler(http.DefaultServeMux))

	http.ListenAndServe(":3000", r)
}

func defaultProcessor(w http.ResponseWriter, r *http.Request) {

//	_, err := getCredential(r, false)
//
//	if err != nil {
//		http.Redirect(w, r, "login/", http.StatusMovedPermanently)
//	} else {
		http.ServeFile(w, r, "templates/index.html")
//	}
}

func loginProcessor(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		decoder := json.NewDecoder(r.Body)
		var credentialinfo map[string]string

		err := decoder.Decode(&credentialinfo)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		username := credentialinfo["userid"]
		password := credentialinfo["password"]

		opts := gophercloud.AuthOptions {
			IdentityEndpoint: openstack_url+":5000/v2.0/",
			Username:username,
			Password:password,
		}

		provider, err := openstack.AuthenticatedClient(opts)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write([]byte(provider.TokenID))
	}
}

func logoutProcessor(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session-name")
	session.Values["userid"] = nil
	session.Values["password"] = nil
	session.Values["defaulttenant"] = nil
	session.Save(r,w)
	http.Redirect(w, r, apppath+"/login/", 302)
}

func vmlistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumeclient, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumepager := volumes.List(volumeclient, volumes.ListOpts{})

	var volumeList = make(map[string][]map[string]interface{})

	err = volumepager.EachPage(func(page pagination.Page)(bool, error) {
		volumelist, err := volumes.ExtractVolumes(page)

		for _, v := range volumelist {
			if len(v.Attachments) > 0 {
				servid := v.Attachments[0]["server_id"].(string)
				volumeInfo := make(map[string]interface{})
				volumeInfo["id"]		= v.ID
				volumeInfo["uuid"]		= v.ID
				volumeInfo["volume_type"]	= v.VolumeType
				volumeInfo["size"]		= v.Size
				volumeInfo["name"]		= v.Name

				volumeList[servid]		= append(volumeList[servid], volumeInfo)
			}
		}
		return true, err
	})

	computeclient, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	computepager := servers.List(computeclient, servers.ListOpts{})

	var emptylist = make([]int, 0)

	err = computepager.EachPage(func(page pagination.Page)(bool, error) {
		serverList, err := servers.ExtractServers(page)

		for _, s := range serverList {

			length := len(volumeList[s.ID])
			serverInfo := make(map[string]interface{})

			serverInfo["id"]		= s.ID
			serverInfo["uuid"]		= s.ID
			serverInfo["name"]		= s.Name
			serverInfo["datadefaulttype"]	= ""
			serverInfo["datavolumeprefix"]	= "data_"+s.Name+"_"
			serverInfo["datavolumecount"]	= 0
			serverInfo["datadefaultsize"]	= 0
			serverInfo["volumes_attached"]	= emptylist

			if length > 0 {
				serverInfo["volumes_attached"]	= volumeList[s.ID]
				serverInfo["datavolumecount"]	= length-1
				serverInfo["datadefaulttype"]	= volumeList[s.ID][0]["volume_type"].(string)
				serverInfo["datadefaultsize"]	= volumeList[s.ID][0]["size"].(int)
			}

			response = append(response, serverInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)

}

func tenantlistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, false)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	client := openstack.NewIdentityV2(provider)

	pager := tenants.List(client, &tenants.ListOpts{})

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		tenantList, err := tenants.ExtractTenants(page)

		for _, t := range tenantList {
			tenantinfo := make(map[string]interface{})
			tenantinfo["tenantID"] = t.ID
			tenantinfo["tenantName"] = t.Name
			response = append(response, tenantinfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)

}

func volumelistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumeclient, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := volumes.List(volumeclient, volumes.ListOpts{})

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		volumeList, err := volumes.ExtractVolumes(page)

		for _, v := range volumeList {
			volumeInfo := make(map[string]interface{})
			volumeInfo["id"] = v.ID
			volumeInfo["uuid"] = v.ID
			volumeInfo["volume_type"] = v.VolumeType
			volumeInfo["size"] = v.Size
			volumeInfo["name"] = v.Name

			response = append(response, volumeInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)

}

func flavorlistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := flavors.ListDetail(client, flavors.ListOpts{})


	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		flavorList, err := flavors.ExtractFlavors(page)

		for _, f := range flavorList {
			flavorInfo := make(map[string]interface{})
			flavorInfo["id"] = f.ID
			flavorInfo["name"] = f.Name
			response = append(response, flavorInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func secgrouplistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := secgroups.List(client)

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		secgroupList, err := secgroups.ExtractSecurityGroups(page)

		for _, sg := range secgroupList {
			secgroupInfo := make(map[string]interface{})
			secgroupInfo["id"]		= sg.ID
			secgroupInfo["name"]	= sg.Name
			response = append(response, secgroupInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func imagelistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := images.ListDetail(client, images.ListOpts{})

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		imageList, err := images.ExtractImages(page)

		for _, i := range imageList {
			if i.Metadata == nil || i.Metadata["image_location"] != "snapshot" {
				imageInfo := make(map[string]interface{})
				imageInfo["id"]		= i.ID
				imageInfo["name"]	= i.Name
				response = append(response, imageInfo)
			}
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func keypairlistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := keypairs.List(client)

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		keypairList, err := keypairs.ExtractKeyPairs(page)

		for _, k := range keypairList {
			keypairInfo := make(map[string]interface{})
			keypairInfo["fingerprint"]	= k.Fingerprint
			keypairInfo["name"]		= k.Name
			response = append(response, keypairInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func osavailabilityzonelistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []string

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result, err := client.ProviderClient.Get(client.Endpoint+"os-availability-zone", nil, nil)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var zoneList = new(AvailableZoneList)
	body, err := ioutil.ReadAll(result.Body)
	err = json.Unmarshal([]byte(string(body)), &zoneList)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, z := range zoneList.AvailabilityZoneInfo {
		response = append(response, z.ZoneName)
	}

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func volumeavailabilityzonelistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []string

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result, err := client.ProviderClient.Get(client.Endpoint+"os-availability-zone", nil, nil)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var zoneList = new(AvailableZoneList)
	body, err := ioutil.ReadAll(result.Body)
	err = json.Unmarshal([]byte(string(body)), &zoneList)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, z := range zoneList.AvailabilityZoneInfo {
		response = append(response, z.ZoneName)
	}

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func volumetypelistProcessor(w http.ResponseWriter, r *http.Request) {

	var response []string

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pager := volumetypes.List(client)

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		volumetypelist, err := volumetypes.ExtractVolumeTypes(page)

		for _, vt := range volumetypelist {
			response = append(response, vt.Name)
		}
		return true, err
	})

	w.Header().Set("Content-Type", "application/json")
	js, err := json.Marshal(response)
	w.Write(js)

}

func networklistProcessor(w http.ResponseWriter, r *http.Request) {
	var response []map[string]interface{}

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	client, err := openstack.NewNetworkV2(provider, gophercloud.EndpointOpts{})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	tenantID := vars["tenantid"]

	pager := networks.List(client, networks.ListOpts{TenantID:tenantID})

	err = pager.EachPage(func(page pagination.Page)(bool, error) {
		networkList, err := networks.ExtractNetworks(page)

		for _, n := range networkList {
			networkInfo := make(map[string]interface{})
			networkInfo["tenantID"]	= n.TenantID
			networkInfo["name"]	= n.Name
			response = append(response, networkInfo)
		}
		return true, err
	})

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func createvolumesProcessor(w http.ResponseWriter, r *http.Request) {

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumeclient, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	computeclient, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if r.Method == "POST" {
		vars := mux.Vars(r)
		vmID := vars["vmid"]
		decoder := json.NewDecoder(r.Body)
		var volumeinfolist []map[string]interface{}
		err = decoder.Decode(&volumeinfolist)
		if err != nil {
			http.Error(w, fmt.Errorf("Wrong json data.").Error(), http.StatusInternalServerError)
			return
		}
		var buildingvolumelist = list.New()
		var completevolumelist = list.New()

		for _, v := range volumeinfolist {
			var volumesize int
			switch v["volumesize"].(type) {
				case float64 :
					volumesize = int(v["volumesize"].(float64))
					break
				case float32 :
					volumesize = int(v["volumesize"].(float32))
					break
				case string :
					_volumesize, err := strconv.ParseInt(v["volumesize"].(string), 10, 64)
					if err != nil {
						http.Error(w, fmt.Errorf("Wrong Req.").Error(), http.StatusInternalServerError)
						return
					}
					volumesize = int(_volumesize)
					break
				case int :
					volumesize = v["volumesize"].(int)
					break
				default :
					http.Error(w, fmt.Errorf("Wrong Req.").Error(), http.StatusInternalServerError)
					return
			}
			var volumetype string
			switch v["volumetype"].(type) {
				case string :
					volumetype = v["volumetype"].(string)
					break
				case nil :
					volumetype = ""
					break
				default:
					http.Error(w, fmt.Errorf("Unknown error.").Error(), http.StatusInternalServerError)
					return
			}
			volumecreateopts := volumes.CreateOpts {
						Name		: v["volumename"].(string),
						Size		: volumesize,
						VolumeType	: volumetype,
						}

			vol, err := volumes.Create(volumeclient, volumecreateopts).Extract()

			if err == nil {
				buildingvolumelist.PushBack(vol)
			}
		}

		var t *list.Element = nil
		for buildingvolumelist.Len() > 0 {
			for e := buildingvolumelist.Front(); e != nil;  {
				e.Value, err = volumes.Get(volumeclient, e.Value.(*volumes.Volume).ID).Extract()
				if e.Value.(*volumes.Volume).Status == "available" {
					completevolumelist.PushBack(e.Value)
					t = e
				}
				e = e.Next()

				if t != nil {
					buildingvolumelist.Remove(t)
					t = nil
				}
			}
			time.Sleep(1000 * time.Millisecond)
		}

		for e := completevolumelist.Front(); e != nil; e = e.Next() {
			opts := volumeattach.CreateOpts{VolumeID:e.Value.(*volumes.Volume).ID}
			_, err := volumeattach.Create(computeclient, vmID, opts).Extract()

			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		for completevolumelist.Len() > 0 {
			for e := completevolumelist.Front(); e != nil;  {
				e.Value, err = volumes.Get(volumeclient, e.Value.(*volumes.Volume).ID).Extract()
//				if err != nil {
//					http.Error(w, err.Error(), http.StatusInternalServerError)
//					return
//				}
				if e.Value.(*volumes.Volume).Status == "in-use" {
					t = e
				}
				e = e.Next()
				if t != nil {
					completevolumelist.Remove(t)
					t = nil
				}
			}
			time.Sleep(1000 * time.Millisecond)
		}
		js, err := json.Marshal(map[string]string{"status":"ok"})

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write(js)
		return
	}
}

func createvmProcessor(w http.ResponseWriter, r *http.Request) {

	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	computeclient, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumeclient, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	networkclient, err := openstack.NewNetworkV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if r.Method == "POST" {
		decoder := json.NewDecoder(r.Body)
		var vminfo map[string]interface{}
		err = decoder.Decode(&vminfo)
		if err != nil {
			http.Error(w, fmt.Errorf("Wrong json data.").Error(), http.StatusInternalServerError)
			return
		}

		volumename := "os_"+vminfo["name"].(string)
		volumesize := 0

		switch vminfo["size"].(type) {
			case float64 :
				volumesize = int(vminfo["size"].(float64))
				break
			case float32 :
				volumesize = int(vminfo["size"].(float32))
				break
			case string :
				_volumesize, err := strconv.ParseInt(vminfo["size"].(string), 10, 64)
				if err != nil {
					http.Error(w, fmt.Errorf("Wrong Req.").Error(), http.StatusInternalServerError)
					return
				}
				volumesize = int(_volumesize)
				break
			case int :
				volumesize = vminfo["size"].(int)
				break
			default :
				http.Error(w, fmt.Errorf("Wrong Req.").Error(), http.StatusInternalServerError)
				return
		}
		volumetype := vminfo["volumetype"].(string)
		imageid, err := images.IDFromName(computeclient, vminfo["image"].(string))
		volumeopts := volumes.CreateOpts{
				Name		: volumename,
				Size		: int(volumesize),
				ImageID		: imageid,
				VolumeType	: volumetype,
				}

		vol, err := volumes.Create(volumeclient, volumeopts).Extract()
		if err != nil {
			http.Error(w, fmt.Errorf("Cannot create volume.").Error(), http.StatusInternalServerError)
			return
		}

		for vol.Status != "available" {
			time.Sleep(1000 * time.Millisecond)
			vol, err = volumes.Get(volumeclient, vol.ID).Extract()
		}

		bd := []bootfromvolume.BlockDevice{
				bootfromvolume.BlockDevice{
					UUID			: vol.ID,
					SourceType		: bootfromvolume.Volume,
					DestinationType		: "volume",
//					VolumeSize		: int(volumesize),
					DeleteOnTermination	: false,
					BootIndex		: 0,
				},
			}

		networkid, err := networks.IDFromName(networkclient, vminfo["network"].(string))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		networklist := []servers.Network{
					servers.Network{
						UUID:networkid,
					},
				}
		secgrouplist := []string{vminfo["secgroup"].(string)}
		keyname, keypairfound := vminfo["keypair"].(string)
		flavorid, err := flavors.IDFromName(computeclient, vminfo["flavor"].(string))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		vmopts := servers.CreateOpts {
				Name			: vminfo["name"].(string),
				AvailabilityZone	: vminfo["oszone"].(string),
				ImageRef		: imageid,
				FlavorRef		: flavorid,
				Networks		: networklist,
				SecurityGroups		: secgrouplist,
				}

		keypairopts := keypairs.CreateOptsExt{vmopts, ""}
		if keypairfound {
			keypairopts = keypairs.CreateOptsExt{vmopts, keyname}
		}

		bdopts := bootfromvolume.CreateOptsExt{keypairopts, bd}

		instance, err := servers.Create(computeclient, bdopts).Extract()

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for instance.Status != "ACTIVE" {
			time.Sleep(1000 * time.Millisecond)
			instance, err = servers.Get(computeclient, instance.ID).Extract()
		}

	}
	w.Write([]byte("OK"))
}

func vminfoProcessor(w http.ResponseWriter, r *http.Request) {

	response := make(map[string]interface{})
	provider, err := getCredential(r, true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	vmid := vars["vmid"]

	if vmid == "" {
		http.Error(w, fmt.Errorf("Must specify vm id").Error(), http.StatusInternalServerError)
		return
	}

	computeclient, err := openstack.NewComputeV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	volumeclient, err := openstack.NewBlockStorageV2(provider, gophercloud.EndpointOpts{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	serverinfo, err := servers.Get(computeclient, vmid).Extract()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var volumeattachlist []map[string]interface{}
	volumeattachpager := volumeattach.List(computeclient, vmid)
	err = volumeattachpager.EachPage(func(page pagination.Page)(bool, error) {
		volumeList, err := volumeattach.ExtractVolumeAttachments(page)

		for _, v := range volumeList {
			volumeinfo, err := volumes.Get(volumeclient, v.VolumeID).Extract()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return false, err
			}
			volumeInfo := make(map[string]interface{})
			volumeInfo["id"]		= volumeinfo.ID
			volumeInfo["uuid"]		= volumeinfo.ID
			volumeInfo["volume_type"]	= volumeinfo.VolumeType
			volumeInfo["size"]		= volumeinfo.Size
			volumeInfo["name"]		= volumeinfo.Name

			volumeattachlist = append(volumeattachlist, volumeInfo)
		}
		return true, err
	})

	var emptylist = make([]int, 0)

	response["id"]			= serverinfo.ID
	response["uuid"]		= serverinfo.ID
	response["name"]		= serverinfo.Name
	response["datadefaulttype"]	= ""
	response["datavolumeprefix"]	= "data_"+serverinfo.Name+"_"
	response["datavolumecount"]	= 0
	response["datadefaultsize"]	= 0
	response["volumes_attached"]	= emptylist

	length := len(volumeattachlist)
	if length > 0 {
		response["volumes_attached"]	= volumeattachlist
		response["datavolumecount"]	= length-1
		response["datadefaulttype"]	= volumeattachlist[0]["volume_type"].(string)
		response["datadefaultsize"]	= volumeattachlist[0]["size"].(int)
	}

	var js []byte
	w.Header().Set("Content-Type", "application/json")
	if response == nil {
		js, err = json.Marshal(make([]int, 0))
	} else {
		js, err = json.Marshal(response)
	}
	w.Write(js)
}

func getCredential(r *http.Request, getTenant bool)(*gophercloud.ProviderClient, error){
	userName := r.Header.Get("UserName")
	password := r.Header.Get("Password")

	if userName == "" || password == "" {
		return nil, fmt.Errorf("Authorization required")
	}

	tenantname := ""

	if getTenant {
		vars := mux.Vars(r)
		tenantname = vars["tenantname"]

		if tenantname == "" {
			return nil, fmt.Errorf("Wrong credential or session.")
		}
	}

	opts := gophercloud.AuthOptions {
		IdentityEndpoint	: openstack_url+":5000/v2.0/",
		Username		: userName,
		Password		: password,
		TenantName		: tenantname,
		}

	provider, err := openstack.AuthenticatedClient(opts)

	if err != nil {
		return nil, err
	}

	return provider, nil
}
